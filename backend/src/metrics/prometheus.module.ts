import { Global, Module } from '@nestjs/common';
import { PrometheusModule as PrometheusModuleBase } from '@willsoto/nestjs-prometheus';
import { CounterProviders } from './metrics.service.js';
import { MetricsService } from './metrics.service.js';

@Global()
@Module({})
export class PrometheusModule {
  static external() {
    return {
      module: PrometheusModule,
      imports: [
        PrometheusModuleBase.register({
          defaultMetrics: {
            enabled: true,
          },
        }),
      ],
    };
  }

  static forRoot() {
    const module = PrometheusModuleBase.register({
      defaultMetrics: {
        enabled: false,
      },
    });
    module.controllers = [];

    return {
      module: PrometheusModule,
      imports: [module],
      providers: [MetricsService, ...CounterProviders],
      exports: [MetricsService],
    };
  }
}
