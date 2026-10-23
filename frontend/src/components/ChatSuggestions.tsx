import { Box, Button, Flex, Stack, Textarea, TextInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { MAX_SUGGESTIONS } from 'src/components';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface ChatSuggestion {
  title: string;
  subtitle: string;
  text: string;
}

interface ChatSuggestionsProps {
  // The name of the form element.
  name: string;
  // The Mantine form instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
}

export function ChatSuggestions(props: ChatSuggestionsProps) {
  const { name, form } = props;
  const { value } = form.getInputProps(name) as { value: ChatSuggestion[] | undefined };
  const fields = value ?? [];

  const addItem = () => {
    form.setFieldValue(name, [...fields, { title: '', subtitle: '', text: '' }]);
  };

  const removeItem = (index: number) => form.removeListItem(name, index);

  return (
    <Stack gap={24}>
      {fields.map((_item: ChatSuggestion, index: number) => (
        <Flex gap={8} key={index}>
          <Stack gap={8} w="100%">
            <Flex gap={8}>
              <Box w="50%">
                <TextInput
                  placeholder={texts.common.title}
                  key={form.key(`${name}.${index}.title`)}
                  {...form.getInputProps(`${name}.${index}.title`)}
                />
              </Box>
              <Box w="50%">
                <TextInput
                  placeholder={texts.common.subtitle}
                  key={form.key(`${name}.${index}.subtitle`)}
                  {...form.getInputProps(`${name}.${index}.subtitle`)}
                />
              </Box>
            </Flex>

            <Flex gap={8}>
              <Box w="100%">
                <Textarea
                  placeholder={texts.common.text}
                  autosize
                  minRows={2}
                  key={form.key(`${name}.${index}.text`)}
                  {...form.getInputProps(`${name}.${index}.text`)}
                />
              </Box>
            </Flex>
          </Stack>

          <div>
            <Button type="button" variant="default" c="red.7" fw={700} onClick={() => removeItem(index)}>
              <Icon size={16} icon="close" />
            </Button>
          </div>
        </Flex>
      ))}

      {fields.length < MAX_SUGGESTIONS && (
        <div>
          <Button type="button" variant="default" leftSection={<Icon size={16} icon="plus" />} onClick={addItem}>
            {texts.theme.suggestionsAdd}
          </Button>
        </div>
      )}
    </Stack>
  );
}
