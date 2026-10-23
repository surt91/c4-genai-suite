import { ActionIcon, Group, Menu, Tooltip } from '@mantine/core';
import { IconChevronDown, IconMicrophone } from '@tabler/icons-react';
import { clsx } from 'clsx';
import { texts } from 'src/texts';
import classes from './VoiceButton.module.css';

export interface Language {
  name: string;
  code: string;
}

interface SpeechRecognitionWrapperProps {
  listening: boolean;
  toggleSpeechRecognition: () => void;
  speechLanguage: string;
  setSpeechLanguage: (speechLanguage: string) => void;
  languages: Language[];
}

export function SpeechRecognitionButton({
  listening,
  toggleSpeechRecognition,
  speechLanguage,
  setSpeechLanguage,
  languages,
}: SpeechRecognitionWrapperProps) {
  const buttonText = listening ? texts.chat.speechRecognition.stopMicrophone : texts.chat.speechRecognition.useMicrophone;
  const toolTipText = `${buttonText} (${speechLanguage})`;

  return (
    <>
      <div className={classes.wrapper}>
        <Group wrap="nowrap" gap={0} align="stretch">
          <Tooltip label={toolTipText}>
            <ActionIcon
              variant={listening ? 'filled' : 'outline'}
              size="lg"
              color={listening ? 'red' : 'black'}
              className={clsx(listening && classes.pulse)}
              onClick={toggleSpeechRecognition}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, width: '36px' }}
              aria-label={toolTipText}
            >
              <IconMicrophone size={16} />
            </ActionIcon>
          </Tooltip>
          <Menu shadow="md" withInitialFocusPlaceholder={false}>
            <Menu.Target>
              <ActionIcon
                variant="outline"
                size="xs"
                disabled={listening}
                aria-label={texts.accessibility.selectLanguage}
                style={{
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  width: '12px',
                  height: 'auto',
                }}
              >
                <IconChevronDown size={12} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown aria-label={texts.accessibility.selectLanguage}>
              {languages.map((language) => (
                <Menu.Item
                  key={language.code}
                  onClick={() => setSpeechLanguage(language.code)}
                  color={speechLanguage === language.code ? 'black' : ''}
                  fw={speechLanguage === language.code ? 'bold' : ''}
                >
                  {language.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>
    </>
  );
}
