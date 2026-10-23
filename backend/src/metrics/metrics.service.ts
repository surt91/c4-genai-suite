import { Injectable } from '@nestjs/common';
import { Counter } from '@prometheus-io/client';
import { InjectMetric, makeCounterProvider } from '@willsoto/nestjs-prometheus';

const appPrefix = 'gaible';

export const MetricCounter = {
  CHATS: { name: `${appPrefix}_chats`, help: 'number of chats that are created', labelNames: ['user'] as const },
  PROMPTS: {
    name: `${appPrefix}_prompts`,
    help: 'number of messages sent to the llm by users',
    labelNames: ['status', 'user'] as const,
  },
};

export const CounterProviders = Object.values(MetricCounter).map((value) => makeCounterProvider(value));

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric(MetricCounter.CHATS.name) public chats: Counter<(typeof MetricCounter.CHATS.labelNames)[number]>,
    @InjectMetric(MetricCounter.PROMPTS.name) public prompts: Counter<(typeof MetricCounter.PROMPTS.labelNames)[number]>,
  ) {}
}
