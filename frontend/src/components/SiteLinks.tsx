import { ActionIcon, Box, Button, Group, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface SiteLink {
  text: string;
  link: string;
}

interface SiteLinkProps {
  // The name of the form element.
  name: string;
  // The Mantine form instance
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
}

export function SiteLinks(props: SiteLinkProps) {
  const { name, form } = props;
  const { value } = form.getInputProps(name) as { value: SiteLink[] | undefined };
  const fields = value ?? [];

  const addItem = () => {
    form.setFieldValue(name, [...fields, { text: '', link: '' }]);
  };

  const removeItem = (index: number) => form.removeListItem(name, index);

  return (
    <SimpleGrid cols={1} spacing={24} verticalSpacing={24}>
      {fields.map((_item: SiteLink, index: number) => (
        <Group gap={8} wrap="nowrap" align="flex-start" key={index}>
          <Stack gap={8} w="100%">
            <Group gap={8} wrap="nowrap" align="flex-start">
              <Box w="50%">
                <TextInput
                  placeholder={texts.common.text}
                  key={form.key(`${name}.${index}.text`)}
                  {...form.getInputProps(`${name}.${index}.text`)}
                />
              </Box>
              <Box w="50%">
                <TextInput
                  placeholder={texts.common.link}
                  key={form.key(`${name}.${index}.link`)}
                  {...form.getInputProps(`${name}.${index}.link`)}
                />
              </Box>
            </Group>
          </Stack>

          <div>
            <ActionIcon type="button" variant="subtle" color="red" size="lg" onClick={() => removeItem(index)}>
              <Icon size={16} icon="close" />
            </ActionIcon>
          </div>
        </Group>
      ))}

      {fields.length < 12 && (
        <div>
          <Button type="button" variant="default" leftSection={<Icon size={16} icon="plus" />} onClick={addItem}>
            <span>{texts.theme.linksAdd}</span>
          </Button>
        </div>
      )}
    </SimpleGrid>
  );
}
