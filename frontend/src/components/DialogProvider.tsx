import { Button, Group } from '@mantine/core';
import { PropsWithChildren, useMemo, useState } from 'react';
import { DialogContext, DialogRequest, useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { Modal } from './Modal';

export function DialogProvider(props: PropsWithChildren) {
  const { children } = props;
  const [request, setRequest] = useState<DialogRequest>();

  const doClose = useEventCallback(() => {
    setRequest(undefined);
  });

  const doPerfom = useEventCallback(() => {
    request?.onPerform?.();
    doClose();
  });

  const doCancel = useEventCallback(() => {
    request?.onCancel?.();
    doClose();
  });

  const context = useMemo(() => {
    const result: DialogContext = {
      showDialog: (request) => {
        doCancel();

        setRequest(request);
      },
    };

    return result;
  }, [doCancel]);

  return (
    <>
      <DialogContext.Provider value={context}>{children}</DialogContext.Provider>

      {request && (
        <Modal
          withinPortal
          size={'sm'}
          // Esc and a click outside cancel the dialog.
          onClose={doCancel}
          header={request.title}
          footer={
            // secondary left, primary right; only the primary button is red (destructive) and the focus is on the
            // non-destructive button
            <Group justify="flex-end" gap={8} wrap="nowrap">
              <Button variant="default" onClick={doCancel} data-autofocus>
                {request.cancelText || texts.common.cancel}
              </Button>

              <Button color={request.destructive === false ? undefined : 'red'} onClick={doPerfom}>
                {request.performText || texts.common.confirm}
              </Button>
            </Group>
          }
        >
          <p>{request.text}</p>
        </Modal>
      )}
    </>
  );
}
