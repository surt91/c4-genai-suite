import { ActionIcon, Alert, Badge, Button, Card, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { RunEvaluationByTestCasesTestCase } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { useWizardStore } from '../../state/zustand/wizardState';

export function ManualTestCasesStep() {
  const { testCases, addTestCase, removeTestCase } = useWizardStore();
  const [currentInput, setCurrentInput] = useState('');
  const [currentExpectedOutput, setCurrentExpectedOutput] = useState('');
  const [currentContext, setCurrentContext] = useState('');
  const t = texts.evals.wizard.manual;

  const handleAddTestCase = () => {
    if (!currentInput.trim() || !currentExpectedOutput.trim()) return;

    const newTestCase: RunEvaluationByTestCasesTestCase = {
      input: currentInput.trim(),
      actualOutput: '', // Will be filled during evaluation
      expectedOutput: currentExpectedOutput.trim(),
      context: currentContext.trim() ? currentContext.trim().split('\n') : undefined,
    };

    addTestCase(newTestCase);
    setCurrentInput('');
    setCurrentExpectedOutput('');
    setCurrentContext('');
  };

  const canAddTestCase = currentInput.trim().length > 0 && currentExpectedOutput.trim().length > 0;

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        {t.title}
      </Text>
      <Text size="sm" c="dimmed">
        {t.hint}
      </Text>

      {testCases.length === 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          {t.addAtLeastOne}
        </Alert>
      )}

      {/* Add New Test Case Form */}
      <Card padding="md" withBorder>
        <Stack gap="md">
          <Text fw={600}>{t.newTestCase}</Text>

          <Textarea
            label={t.input}
            placeholder={t.inputPlaceholder}
            required
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            minRows={3}
          />

          <Textarea
            label={t.expectedOutput}
            placeholder={t.expectedOutputPlaceholder}
            required
            value={currentExpectedOutput}
            onChange={(e) => setCurrentExpectedOutput(e.target.value)}
            minRows={3}
          />

          <Textarea
            label={t.context}
            description={t.contextDescription}
            placeholder={t.contextPlaceholder}
            value={currentContext}
            onChange={(e) => setCurrentContext(e.target.value)}
            minRows={2}
          />

          <Group justify="flex-end">
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddTestCase} disabled={!canAddTestCase}>
              {t.add}
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Existing Test Cases */}
      {testCases.length > 0 && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>{t.testCases(testCases.length)}</Text>
            <Badge variant="light" color="blue">
              {t.count(testCases.length)}
            </Badge>
          </Group>

          {testCases.map((testCase, index) => (
            <Card key={index} padding="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs" flex={1}>
                  <Group gap="xs">
                    <Badge size="sm" variant="outline">
                      #{index + 1}
                    </Badge>
                    <Text fw={600} size="sm">
                      {t.question}
                    </Text>
                  </Group>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {testCase.input}
                  </Text>

                  <Text fw={600} size="sm" mt="xs">
                    {t.expectedOutputLabel}
                  </Text>
                  <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                    {testCase.expectedOutput}
                  </Text>

                  {testCase.context && testCase.context.length > 0 && (
                    <>
                      <Text fw={600} size="sm" mt="xs">
                        {t.contextLabel}
                      </Text>
                      <Stack gap="xs">
                        {testCase.context.map((ctx, ctxIndex) => (
                          <Text key={ctxIndex} size="sm" c="dimmed">
                            • {ctx}
                          </Text>
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>

                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => removeTestCase(index)}
                  title={t.remove}
                  aria-label={t.remove}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
