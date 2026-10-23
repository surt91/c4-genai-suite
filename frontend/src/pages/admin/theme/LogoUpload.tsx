import { Button, Divider } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { Alert, Logo, Markdown } from 'src/components';
import { useTheme } from 'src/hooks';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import classes from './Theme.module.css';

type LogoUploadProps = {
  imageType: 'logo' | 'backgroundLogo' | 'avatarLogo';
};

export function LogoUpload({ imageType }: LogoUploadProps) {
  const api = useApi();

  const { setTheme, theme, refetch } = useTheme();
  const [previewLogo, setPreviewLogo] = useState<File | undefined | null>(undefined);

  const updating = useMutation({
    mutationFn: (request: File) => {
      return api.settings.postImage(imageType, request);
    },
    onSuccess: () => {
      refetch();
      setTheme({ key: Date.now() });
      setPreviewLogo(undefined);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.theme.logoUpdateFailed, error));
    },
  });

  const deleting = useMutation({
    mutationFn: () => {
      return api.settings.deleteLogo(imageType);
    },
    onSuccess: () => {
      refetch();
      setTheme({ key: Date.now() });
      setPreviewLogo(undefined);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.theme.logoDeleteFailed, error));
    },
  });

  const upload = () => {
    if (previewLogo) {
      updating.mutate(previewLogo);
    }
  };

  const deleteLogo = () => {
    deleting.mutate();
  };

  return (
    <>
      <MutationAlert error={updating.isError || deleting.isError} />

      <div>
        <div className={classes.logoRow}>
          <div className={classes.logo}>
            <Logo size="6rem" key={theme.key} url={theme[`${imageType}Url`]} previewLogo={previewLogo} />
          </div>

          <Divider orientation="vertical" mx={24} />

          <div>
            <div className={classes.controls}>
              <LogoInput onChange={setPreviewLogo} previewLogo={previewLogo} />
              <SaveButton onClick={upload} disabled={updating.isPending || !previewLogo} />
              <DeleteButton onClick={deleteLogo} disabled={!theme[`${imageType}Url`] || deleting.isPending} />
            </div>
            <div className={classes.hint}>
              <Markdown>{texts.theme[`${imageType}Hint`]}</Markdown>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MutationAlert({ error }: { error: boolean }) {
  if (error) return <Alert text={texts.common.error} className={classes.alert} />;
}

function SaveButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="default" disabled={disabled} onClick={onClick}>
      {texts.common.save}
    </Button>
  );
}

function DeleteButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="default" disabled={disabled} onClick={onClick}>
      {texts.common.remove}
    </Button>
  );
}

function LogoInput({
  onChange,
  previewLogo,
}: {
  onChange: (file: File | undefined) => void;
  previewLogo: File | undefined | null;
}) {
  return (
    <input
      type="file"
      value={!previewLogo ? '' : undefined}
      data-testid="logo-upload-input"
      className={classes.fileInput}
      onChange={(event) => onChange(event.target.files?.[0])}
      aria-label={texts.accessibility.uploadLogoFile}
    />
  );
}
