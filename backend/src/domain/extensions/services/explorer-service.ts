import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer } from '@nestjs/core';
import { Extension, EXTENSION_METADATA } from '../interfaces.js';

@Injectable()
export class ExplorerService {
  private extensions?: Record<string, Extension>;
  private readonly enabledExtensions: Set<string>;

  constructor(
    private readonly modulesContainer: ModulesContainer,
    configService: ConfigService,
  ) {
    const extensions = configService.get<string | undefined>('EXTENSIONS');
    this.enabledExtensions = new Set(extensions ? extensions.split(',').map((e) => e.trim()) : []);
  }

  getExtension(name: string): Extension | undefined {
    return this.allExtensions[name];
  }

  getExtensions(): Extension[] {
    return Object.values(this.allExtensions);
  }

  private isEnabled(extension: Extension): boolean {
    return this.enabledExtensions.size === 0 || this.enabledExtensions.has(extension.spec.name);
  }

  private get allExtensions() {
    if (this.extensions) {
      return this.extensions;
    }

    const allExtensions: Extension[] = [];

    this.extensions = {};
    for (const module of this.modulesContainer.values()) {
      const providers = module.providers;

      for (const wrapper of providers.values()) {
        if (!wrapper) {
          continue;
        }

        const instance = wrapper.instance;
        if (!instance || !instance.constructor) {
          continue;
        }

        if (Reflect.getMetadata(EXTENSION_METADATA, instance.constructor)) {
          const extension = instance as Extension;
          if (this.isEnabled(extension)) {
            allExtensions.push(extension);
          }
        }
      }
    }

    allExtensions.sort((a, b) => a.spec.title.localeCompare(b.spec.title));

    for (const extension of allExtensions) {
      this.extensions[extension.spec.name] = extension;
    }

    return this.extensions;
  }
}
