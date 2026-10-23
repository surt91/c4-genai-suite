import { ActionIcon, Card, Textarea, TextareaProps, TextInput, TextInputProps } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { texts } from 'src/texts';
import classes from './ChatSuggestionInputCard.module.css';

type ChatSuggestionInputCardProps = {
  titleProps: TextInputProps;
  subtitleProps: TextInputProps;
  suggestionProps: TextareaProps;
  onDeleteClick: VoidFunction;
};

export const ChatSuggestionInputCard = ({
  titleProps,
  subtitleProps,
  suggestionProps,
  onDeleteClick,
}: ChatSuggestionInputCardProps) => (
  <Card withBorder radius="md" className={classes.card}>
    <TextInput mb="xs" label={texts.common.title} placeholder={texts.common.title} {...titleProps} />
    <TextInput mb="xs" label={texts.common.subtitle} placeholder={texts.common.subtitle} {...subtitleProps} />
    <Textarea
      style={{ colSpan: 2 }}
      label={texts.common.text}
      placeholder={texts.common.text}
      autosize
      minRows={3}
      maxRows={15}
      {...suggestionProps}
    />
    <ActionIcon color="red" className={classes.delete} variant="light" onClick={onDeleteClick}>
      <IconTrash size={20} />
    </ActionIcon>
  </Card>
);
