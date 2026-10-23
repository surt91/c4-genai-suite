import { ActionIcon, Button, Card, Flex, Text, Tooltip } from '@mantine/core';
import { IconThumbDown, IconThumbUp, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { texts } from 'src/texts';

type DialogResult = 'yes' | 'no' | 'dismiss';

interface DialogProps {
  title: string;
  yesLabel?: string;
  noLabel?: string;
  thankYouText?: string;
  showThankYou?: boolean;
  onSubmit: (result: DialogResult) => void;
  initialVisible?: boolean;
}

export function Dialog({
  title,
  yesLabel = texts.common.yes,
  noLabel = texts.common.no,
  thankYouText,
  showThankYou = true,
  onSubmit,
  initialVisible = true,
}: DialogProps) {
  const [isVisible, setVisible] = useState(initialVisible);
  const [showThanks, setShowThanks] = useState(false);

  const handleResult = (result: DialogResult) => {
    onSubmit(result);
    if (result !== 'dismiss' && showThankYou) {
      setShowThanks(true);
    }
    setVisible(false);
  };

  useEffect(() => {
    if (showThanks) {
      const timeout = setTimeout(() => setShowThanks(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [showThanks]);

  if (showThanks && thankYouText) {
    return (
      <Card withBorder radius="lg" shadow="lg" className="fade-in">
        <Flex gap="xl" align="center">
          <Text size="sm" fw={500}>
            {thankYouText}
          </Text>
          <Tooltip label={texts.chat.updateRating.close}>
            {/* the answer has been given already, closing only hides the thanks */}
            <ActionIcon variant="subtle" onClick={() => setShowThanks(false)} aria-label={texts.chat.updateRating.close}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Card>
    );
  }

  if (isVisible) {
    return (
      <Card withBorder radius="lg" shadow="lg" className="fade-in">
        <Flex gap="xl" align="center">
          <Text size="sm" fw={500}>
            {title}
          </Text>
          <Tooltip label={texts.chat.updateRating.close}>
            <ActionIcon variant="subtle" onClick={() => handleResult('dismiss')} aria-label={texts.chat.updateRating.close}>
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Flex>
        <Flex gap="sm" mt="lg" align="center" justify="center">
          <Button onClick={() => handleResult('no')} variant="default" leftSection={<IconThumbDown size={16} />}>
            {noLabel}
          </Button>
          <Button onClick={() => handleResult('yes')} variant="default" leftSection={<IconThumbUp size={16} />}>
            {yesLabel}
          </Button>
        </Flex>
      </Card>
    );
  }

  return null;
}
