<!--
  @component AskUserQuestionDialog
  @description AskUserQuestion 工具对话框，让用户回答 Claude 提出的问题。
               支持单选和多选，可选 preview 展示。
  @layer component
-->
<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="$emit('cancel')">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2>请回答以下问题</h2>
          <button class="close-btn" @click="$emit('cancel')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <div
            v-for="(question, qIdx) in questions"
            :key="qIdx"
            class="question-item"
          >
            <div class="question-header">
              <span class="question-badge">{{ question.header }}</span>
              <span class="question-text">{{ question.question }}</span>
            </div>

            <div class="options-list">
              <button
                v-for="(option, oIdx) in question.options"
                :key="oIdx"
                class="option-btn"
                :class="{ selected: isSelected(question, option.label) }"
                @click="toggleOption(question, option.label)"
              >
                <div class="option-indicator">
                  <svg v-if="question.multiSelect" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path v-if="isSelected(question, option.label)" d="M9 12l2 2 4-4"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="9"/>
                    <circle v-if="isSelected(question, option.label)" cx="12" cy="12" r="5" fill="currentColor"/>
                  </svg>
                </div>
                <div class="option-content">
                  <span class="option-label">{{ option.label }}</span>
                  <span v-if="option.description" class="option-desc">{{ option.description }}</span>
                </div>
              </button>
            </div>

            <!-- Preview 展示（如果存在） -->
            <div v-if="getSelectedPreview(question)" class="option-preview">
              <pre>{{ getSelectedPreview(question) }}</pre>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
          <button class="btn btn-primary" @click="submit" :disabled="!canSubmit">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { AskUserQuestionItem, AskUserQuestionOption } from '#claude/types'

const props = defineProps<{
  /** 是否显示对话框 */
  visible: boolean
  /** 问题列表 */
  questions: AskUserQuestionItem[]
}>()

const emit = defineEmits<{
  /** 提交答案 */
  submit: [answers: Record<string, string>]
  /** 取消 */
  cancel: []
}>()

// ── 答案状态 ─────────────────────────────────────────────────────────────────

/** 每个问题的选中答案：question -> label | labels */
const selectedAnswers = ref<Record<string, string | string[]>>({})

// ── 初始化默认值 ─────────────────────────────────────────────────────────────

function initDefaults() {
  const answers: Record<string, string | string[]> = {}
  for (const q of props.questions) {
    answers[q.question] = q.multiSelect ? [] : ''
  }
  selectedAnswers.value = answers
}

// 监听 visible 变化，初始化默认值
import { watch } from 'vue'
watch(() => props.visible, (visible) => {
  if (visible) {
    initDefaults()
  }
})

// ── 选项操作 ─────────────────────────────────────────────────────────────────

function isSelected(question: AskUserQuestionItem, label: string): boolean {
  const answer = selectedAnswers.value[question.question]
  if (question.multiSelect) {
    return Array.isArray(answer) && answer.includes(label)
  }
  return answer === label
}

function toggleOption(question: AskUserQuestionItem, label: string): void {
  const key = question.question
  if (question.multiSelect) {
    const current = selectedAnswers.value[key] as string[] || []
    const idx = current.indexOf(label)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      current.push(label)
    }
    selectedAnswers.value[key] = [...current]
  } else {
    selectedAnswers.value[key] = label
  }
}

function getSelectedPreview(question: AskUserQuestionItem): string | null {
  const answer = selectedAnswers.value[question.question]
  if (!answer || (Array.isArray(answer) && answer.length === 0)) {
    return null
  }

  // 查找选中选项的 preview
  const labels = Array.isArray(answer) ? answer : [answer]
  const previews: string[] = []
  for (const label of labels) {
    const option = question.options.find(o => o.label === label)
    if (option?.preview) {
      previews.push(option.preview)
    }
  }

  return previews.length > 0 ? previews.join('\n\n') : null
}

// ── 提交逻辑 ─────────────────────────────────────────────────────────────────

const canSubmit = computed(() => {
  for (const q of props.questions) {
    const answer = selectedAnswers.value[q.question]
    if (q.multiSelect) {
      if (!Array.isArray(answer) || answer.length === 0) {
        return false
      }
    } else {
      if (!answer) {
        return false
      }
    }
  }
  return true
})

function submit() {
  if (!canSubmit.value) return

  // 转换为 string 格式（多选用逗号分隔）
  const answers: Record<string, string> = {}
  for (const q of props.questions) {
    const answer = selectedAnswers.value[q.question]
    if (Array.isArray(answer)) {
      answers[q.question] = answer.join(', ')
    } else {
      answers[q.question] = answer
    }
  }

  emit('submit', answers)
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: var(--color-background);
  border-radius: var(--radius-xl);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 90%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.dialog-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-foreground);
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--color-muted-foreground);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-md);
  transition: var(--transition-gentle);
}

.close-btn:hover {
  background: var(--color-muted);
  color: var(--color-foreground);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.question-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.question-badge {
  flex-shrink: 0;
  background: var(--color-primary)/10;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.question-text {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-foreground);
  line-height: 1.4;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-muted);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-gentle);
}

.option-btn:hover {
  background: var(--color-muted)/80;
}

.option-btn.selected {
  border-color: var(--color-primary);
  background: var(--color-primary)/5;
}

.option-indicator {
  flex-shrink: 0;
  color: var(--color-muted-foreground);
  margin-top: 2px;
}

.option-btn.selected .option-indicator {
  color: var(--color-primary);
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.option-label {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-foreground);
}

.option-desc {
  font-size: 0.8125rem;
  color: var(--color-muted-foreground);
  line-height: 1.4;
}

.option-preview {
  margin-top: 8px;
  padding: 12px;
  background: var(--color-muted);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.option-preview pre {
  margin: 0;
  font-family: monospace;
  font-size: 0.8125rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--color-foreground);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 10px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-gentle);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-muted);
  border: 1px solid var(--color-border);
  color: var(--color-foreground);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-muted)/80;
}

.btn-primary {
  background: var(--color-primary);
  border: 1px solid var(--color-primary);
  color: var(--color-primary-foreground);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
</style>