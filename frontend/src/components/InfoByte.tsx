import { Box, Stack } from '@mantine/core';

type InfoByteProps = {
  title: string;
  value: string | number;
};

export function InfoByte(props: InfoByteProps) {
  return (
    <Stack gap={8}>
      <Box fw={600}>{props.title}</Box>
      <Box fw={400}>{props.value}</Box>
    </Stack>
  );
}
