import { ActionIcon } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { ConfigurationDto, ExportedConfigurationDto, useApi } from 'src/api';
import { Icon, Page } from 'src/components';
import { useEventCallback, useTransientNavigate } from 'src/hooks';
import { buildError } from 'src/lib';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';
import { Configuration } from './Configuration.tsx';
import { EmptyPage } from './EmptyPage';
import classes from './Extensions.module.css';
import { ExtensionsPage } from './ExtensionsPage';
import { UpsertConfigurationDialog } from './UpsertConfigurationDialog.tsx';
import { useConfigurationStore } from './state';

export function ConfigurationPage() {
  const api = useApi();
  const { i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useTransientNavigate();
  const [toCreate, setToCreate] = useState<boolean>();
  const [toUpdate, setToUpdate] = useState<ConfigurationDto | null>(null);
  const { configurations, removeConfiguration, setConfiguration, setConfigurations } = useConfigurationStore();

  const { data: loadedConfigurations, isFetched } = useQuery({
    queryKey: [`configurations_${i18n.language}`],
    queryFn: () => api.extensions.getConfigurations(),
  });

  useEffect(() => {
    if (loadedConfigurations) {
      setConfigurations(loadedConfigurations.items);
    }
  }, [loadedConfigurations, setConfigurations]);

  const deleting = useMutation({
    mutationFn: (configuration: ConfigurationDto) => {
      return api.extensions.deleteConfiguration(configuration.id);
    },
    onSuccess: (_, configuration) => {
      removeConfiguration(configuration.id);
      navigate('/admin/assistants/');
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.removeConfigurationFailed, error));
    },
  });

  const duplicate = useMutation({
    mutationFn: (configuration: ConfigurationDto) => {
      return api.extensions.duplicateConfiguration(configuration.id);
    },
    onSuccess: (configuration) => {
      setConfiguration(configuration);
      navigate(`/admin/assistants/${configuration.id}`);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.duplicateConfigurationFailed, error));
    },
  });

  const importConfig = useMutation({
    mutationFn: (data: ExportedConfigurationDto) => {
      return api.extensions.importConfiguration({ data });
    },
    onSuccess: (result) => {
      const configuration = result._configuration;
      setConfiguration(configuration);
      setToUpdate(configuration);

      toast.success(texts.extensions.importConfigurationSuccess);
      for (const warning of result.warnings) {
        toast.warn(warning);
      }
      navigate(`/admin/assistants/${configuration.id}`);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.extensions.importConfigurationFailed, error));
    },
  });

  const doCreate = useEventCallback((configuration: ConfigurationDto) => {
    setConfiguration(configuration);
    navigate(`/admin/assistants/${configuration.id}`);
  });

  const doClose = useEventCallback(() => {
    setToUpdate(null);
    setToCreate(false);
  });

  const handleFileChange = useEventCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let data: ExportedConfigurationDto;
      try {
        data = JSON.parse(text) as ExportedConfigurationDto;
      } catch {
        toast.error(texts.extensions.importConfigurationInvalidJson);
        return;
      }
      importConfig.mutate(data);
    } catch (error) {
      // Handle file reading errors
      toast.error(await buildError(texts.extensions.importConfigurationFailed, error as Error));
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Page
      menu={
        <div className={classes.menu}>
          <div className={classes.menuHeader}>
            <h3 id={texts.extensions.configurations} className={classes.menuTitle}>
              {texts.extensions.configurations}
            </h3>

            <ActionIcon
              variant="default"
              size={32}
              onClick={handleImportClick}
              title={texts.extensions.importConfiguration}
              aria-label={texts.extensions.importConfiguration}
            >
              <Icon icon="arrow-up" size={16} />
            </ActionIcon>

            <ActionIcon
              variant="default"
              size={32}
              onClick={() => setToCreate(true)}
              aria-label={texts.extensions.createConfiguration}
            >
              <Icon icon="plus" size={16} />
            </ActionIcon>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className={classes.menuList}>
            <div aria-labelledby={texts.extensions.configurations} className={clsx('nav-menu', classes.menuEntries)}>
              {configurations.map((configuration) => (
                <Configuration
                  key={configuration.id}
                  configuration={configuration}
                  onDelete={deleting.mutate}
                  onUpdate={setToUpdate}
                  onDuplicate={duplicate.mutate}
                />
              ))}
            </div>

            {configurations.length === 0 && isFetched && (
              <div className={classes.menuEmpty}>{texts.extensions.configurationsEmpty}</div>
            )}
          </div>
        </div>
      }
    >
      <Routes>
        <Route path=":id" element={<ExtensionsPage />} />
        <Route path="" element={<EmptyPage />} />
      </Routes>

      {(toCreate || toUpdate) && (
        <UpsertConfigurationDialog onClose={doClose} onCreate={doCreate} onUpdate={setConfiguration} target={toUpdate} />
      )}
    </Page>
  );
}
