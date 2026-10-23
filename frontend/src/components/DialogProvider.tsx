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
          onClose={doClose}
          header={request.title}
          footer={
            <Group justify="flex-end" gap={8} wrap="nowrap">
              <Button variant="subtle" color="red" onClick={doCancel}>
                {request.cancelText || texts.common.cancel}
              </Button>

              <Button color="red" onClick={doPerfom} autoFocus>
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
