import { Badge, Group, Text } from '@mantine/core';
import { PluginFeature } from 'src/api/generated-eval';
import { texts } from 'src/texts';

interface LlmEndpointFeaturesBadgeProps {
  features: PluginFeature[];
}

export function LlmEndpointFeaturesBadge({ features }: LlmEndpointFeaturesBadgeProps) {
  if (!features || features.length === 0) {
    return (
      <Text span c="gray.6">
        -
      </Text>
    );
  }

  return (
    <Group gap={6} wrap="nowrap">
      {features.map((feature) => (
        <Badge key={feature} component="span" size="sm" variant="outline" color="dark" tt="none">
          {getFeatureLabel(feature)}
        </Badge>
      ))}
    </Group>
  );
}

function getFeatureLabel(feature: PluginFeature): string {
  switch (feature) {
    case PluginFeature.ChatModel:
      return texts.evals.llmEndpoint.featureChat;
    case PluginFeature.LlmQuery:
      return texts.evals.llmEndpoint.featureLlm;
    default:
      return String(feature);
  }
}
