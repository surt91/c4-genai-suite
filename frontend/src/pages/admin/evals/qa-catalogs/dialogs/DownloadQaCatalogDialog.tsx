import { Box, Button, Group, MultiSelect, Portal, Radio, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconDownload } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type QACatalogVersionHistoryItem, SupportedQACatalogDownloadFormat } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { Modal } from 'src/components';
import { toast } from 'src/lib/notifications';
import { texts } from 'src/texts';

interface DownloadQaCatalogDialogProps {
  catalogId: string;
  catalogName: string;
  versions: QACatalogVersionHistoryItem[];
  onClose: () => void;
}

type VersionSelection = 'current' | 'specific' | 'all';

interface FormValues {
  format: SupportedQACatalogDownloadFormat;
  versionSelection: VersionSelection;
  selectedVersions: string[];
}

export function DownloadQaCatalogDialog({ catalogId, versions, onClose }: DownloadQaCatalogDialogProps) {
  const evalApi = useEvalApi();

  const form = useForm<FormValues>({
    initialValues: {
      format: SupportedQACatalogDownloadFormat.Csv,
      versionSelection: 'current',
      selectedVersions: [],
    },
    mode: 'controlled',
  });

  const versionOptions = useMemo(() => {
    return versions.map((v) => ({
      value: v.versionId,
      label: `v${v.revision} - ${v.createdAt.toLocaleDateString()}`,
    }));
  }, [versions]);

  const downloadMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const options = {
        format: values.format,
        parentCatalogId: catalogId,
        versionIds: values.versionSelection === 'specific' ? values.selectedVersions : undefined,
        includeAll: values.versionSelection === 'all',
      };

      return evalApi.qaCatalog.qaCatalogDownload(options);
    },
    onSuccess: (response) => {
      if (response.downloadUrl) {
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      onClose();
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.downloadFailed);
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    downloadMutation.mutate(values);
  });

  return (
    <Portal>
      <form noValidate onSubmit={handleSubmit}>
        <Modal
          onClose={onClose}
          header={texts.evals.qaCatalog.downloadTitle}
          footer={
            <Group justify="flex-end" gap={16} wrap="nowrap">
              <Button type="button" variant="subtle" onClick={onClose}>
                {texts.common.cancel}
              </Button>
              <Button type="submit" leftSection={<IconDownload size={16} />} loading={downloadMutation.isPending}>
                {texts.evals.qaCatalog.downloadStart}
              </Button>
            </Group>
          }
        >
          {/* Format selection */}
          <Box mb={24}>
            <Text component="label" display="block" mb={8} fz="sm" fw={500}>
              {texts.evals.qaCatalog.downloadFormat}
            </Text>
            <Radio.Group value={form.values.format} onChange={(value) => form.setFieldValue('format', value)}>
              <Stack gap="xs">
                <Radio value={SupportedQACatalogDownloadFormat.Csv} label={texts.evals.qaCatalog.downloadFormatCsv} />
                <Radio value={SupportedQACatalogDownloadFormat.Json} label={texts.evals.qaCatalog.downloadFormatJson} />
                <Radio value={SupportedQACatalogDownloadFormat.Yaml} label={texts.evals.qaCatalog.downloadFormatYaml} />
                <Radio value={SupportedQACatalogDownloadFormat.Xlsx} label={texts.evals.qaCatalog.downloadFormatXlsx} />
              </Stack>
            </Radio.Group>
          </Box>

          {/* Version selection */}
          <Box mb={16}>
            <Text component="label" display="block" mb={8} fz="sm" fw={500}>
              {texts.evals.qaCatalog.downloadVersions}
            </Text>
            <Radio.Group value={form.values.versionSelection} onChange={(value) => form.setFieldValue('versionSelection', value)}>
              <Stack gap="xs">
                <Radio value="current" label={texts.evals.qaCatalog.downloadCurrentVersion} />
                {versions.length > 1 && (
                  <>
                    <Radio value="specific" label={texts.evals.qaCatalog.downloadSpecificVersions} />
                    <Radio value="all" label={texts.evals.qaCatalog.downloadAllVersions} />
                  </>
                )}
              </Stack>
            </Radio.Group>
          </Box>

          {/* Specific versions selector */}
          {form.values.versionSelection === 'specific' && (
            <MultiSelect
              label={texts.evals.qaCatalog.downloadSelectVersions}
              data={versionOptions}
              value={form.values.selectedVersions}
              onChange={(value) => form.setFieldValue('selectedVersions', value)}
              mb={16}
            />
          )}
        </Modal>
      </form>
    </Portal>
  );
}
