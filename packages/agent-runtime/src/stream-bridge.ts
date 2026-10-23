import { writeAiAudit } from '@endwise/modules/audit';
import { publishEvent } from '@endwise/modules/stream';
import type { AgentContext } from './context.ts';
import type { AgentEvent } from './loop.ts';

/**
 * F6-13 × F6-02 — AI-streamingen går på samme SSE-kanal som meldingene.
 * Token-tekst beholdes i `stream_events` for live avspilling (ai-innsikt),
 * og slettes av retensjons-cron (`AI_LOG_RETENTION_DAYS`, default 30).
 * Den parallelle AI-audit-raden i `audit_log` har aldri prompt- eller svartekst.
 */
function auditMetadata(event: AgentEvent): Record<string, unknown> {
  if (event.type === 'agent.start') return { agent: event.agent };
  if (event.type === 'agent.tool_call' || event.type === 'agent.tool_result') {
    return { tool: event.tool };
  }
  if (event.type === 'agent.error') return { failed: true };
  return { event: event.type };
}

export function createStreamBridge(context: AgentContext) {
  return async (event: AgentEvent): Promise<void> => {
    if (
      event.type === 'agent.start' ||
      event.type === 'agent.done' ||
      event.type === 'agent.error'
    ) {
      void writeAiAudit(context.db, {
        tenantId: context.tenantId,
        actor: context.userId,
        action:
          event.type === 'agent.start'
            ? 'ai.run'
            : event.type === 'agent.done'
              ? 'ai.done'
              : 'ai.error',
        subjectType: 'agent',
        subjectId: context.threadId ?? (event.type === 'agent.start' ? event.agent : null),
        metadata: auditMetadata(event),
      }).catch(() => undefined);
    }

    await publishEvent(context.db, {
      tenantId: context.tenantId,
      audienceId: context.userId,
      type: event.type,
      subjectId: context.threadId ?? null,
      payload: { ...event },
    });
  };
}
