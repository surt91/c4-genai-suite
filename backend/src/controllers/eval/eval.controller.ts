import { Readable } from 'stream';
import { All, Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RequestInit, fetch as undiciFetch } from 'undici';
import { LocalAuthGuard, RoleGuard } from 'src/domain/auth';
import { Role } from 'src/domain/auth/role.decorator';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import { EvalServiceStatusDto } from './dtos';

/**
 * Authenticated controller for eval service requests.
 *
 * This controller forwards requests to the internal eval service with authentication.
 * All routes are protected with LocalAuthGuard (session auth) and RoleGuard (admin only).
 *
 * Guards execute BEFORE the controller method, ensuring req.user is populated.
 * The controller method then forwards authenticated requests to the eval service.
 */
const NOT_FORWARDED_RESPONSE_HEADERS = ['connection', 'keep-alive', 'transfer-encoding', 'content-length', 'content-encoding'];

/**
 * JSON and url-encoded bodies were already consumed by the body parsers and are serialized again in their own format;
 * any other body (e.g. multipart file uploads) is still unread and streamed through unchanged.
 */
export function buildProxyBody(req: Request): Pick<RequestInit, 'body' | 'duplex'> {
  if (['GET', 'HEAD'].includes(req.method)) {
    return {};
  }

  const contentType = req.headers['content-type'] ?? '';
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return { body: new URLSearchParams(req.body as Record<string, string>).toString() };
  }
  if (contentType.includes('json')) {
    return { body: JSON.stringify(req.body ?? {}) };
  }
  if (!contentType) {
    return {};
  }

  return { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' };
}

@Controller('eval')
@UseGuards(LocalAuthGuard, RoleGuard)
@Role(BUILTIN_USER_GROUP_ADMIN)
@ApiTags('eval')
export class EvalController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Check whether the eval service feature is enabled.
   *
   * Returns `{ available: true }` when the `EVAL_SERVICE_ENABLED` environment
   * variable is set to `"true"`, otherwise `{ available: false }`.
   *
   * The frontend uses this to conditionally show/hide the Evaluations section
   * in the admin sidebar. When the eval service is not deployed, the entire
   * UI section is hidden so users don't encounter dead functionality.
   *
   * This route is defined BEFORE the wildcard `@All('*')` so NestJS matches
   * it first and doesn't forward it to the eval service proxy.
   *
   * Access: Admin users only (inherits controller-level guards)
   */
  @Get('status')
  @ApiOperation({
    operationId: 'getEvalServiceStatus',
    summary: 'Check if the eval service feature is enabled',
    description:
      'Returns whether the evaluation service is enabled via the EVAL_SERVICE_ENABLED env var. ' +
      'Used by the frontend to conditionally render the evaluations UI.',
  })
  @ApiOkResponse({ type: EvalServiceStatusDto })
  getStatus(): EvalServiceStatusDto {
    const dto = new EvalServiceStatusDto();
    dto.available = this.configService.get<string>('EVAL_SERVICE_ENABLED', 'false') === 'true';
    return dto;
  }

  /**
   * Proxy all requests to eval service.
   *
   * This wildcard route matches all HTTP methods and paths under /eval/*.
   * Guards execute first to validate authentication and admin role.
   * Then this method forwards the request to the eval service.
   *
   * Access: Admin users only
   */
  @All('*')
  @ApiExcludeEndpoint()
  async proxy(@Req() req: Request, @Res() res: Response) {
    const evalServiceUrl = this.configService.get<string>('EVAL_SERVICE_URL', 'http://localhost:3202');

    // Remove /api/eval prefix from path for forwarding
    const targetPath = req.path.replace(/^\/api\/eval/, '');

    // Forward the query string verbatim (re-encoding `req.query` would merge repeated parameters).
    const queryIndex = req.originalUrl.indexOf('?');
    const queryString = queryIndex >= 0 ? req.originalUrl.substring(queryIndex) : '';

    const targetUrl = `${evalServiceUrl}${targetPath}${queryString}`;

    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'X-User-Id': req.user.id,
        'X-User-Name': req.user.name,
      };

      if (req.user.email) {
        headers['X-User-Email'] = req.user.email;
      }

      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'];
      }

      const response = await undiciFetch(targetUrl, {
        method: req.method,
        headers,
        ...buildProxyBody(req),
      });

      // Get response body
      const buffer = await response.arrayBuffer();
      const responseBody = Buffer.from(buffer);

      // Forward response headers, except hop-by-hop headers and those describing the original encoding
      // (fetch already decoded the body, `res.send` sets the length).
      response.headers.forEach((value, key) => {
        if (!NOT_FORWARDED_RESPONSE_HEADERS.includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });

      // Forward status and body
      res.status(response.status);
      res.send(responseBody);
    } catch (error) {
      console.error('Eval proxy error:', error instanceof Error ? error.message : String(error));

      if (!res.headersSent) {
        res.status(502).json({
          error: 'Bad Gateway',
          message: 'Eval service is unavailable',
        });
      }
    }
  }
}
