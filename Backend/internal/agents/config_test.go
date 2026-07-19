package agents

import (
	"strings"
	"testing"
)

func TestEveryAgentLoadsItsSkill(t *testing.T) {
	t.Parallel()

	if err := ValidateSkills(); err != nil {
		t.Fatalf("ValidateSkills() error = %v", err)
	}
	for _, agent := range List() {
		prompt, err := agent.Prompt(ConversationMode)
		if err != nil {
			t.Fatalf("Prompt(%q) error = %v", agent.ID, err)
		}
		if !strings.Contains(prompt, "$"+agent.SkillName) {
			t.Fatalf("agent %q prompt does not invoke skill %q", agent.ID, agent.SkillName)
		}
		if !strings.Contains(prompt, "当前处于对话模式") {
			t.Fatalf("agent %q prompt is missing conversation mode", agent.ID)
		}
	}
}

func TestGenerationPromptSelectsGenerationMode(t *testing.T) {
	t.Parallel()

	agent, _ := Get("task")
	prompt, err := agent.Prompt(GenerationMode)
	if err != nil {
		t.Fatalf("Prompt() error = %v", err)
	}
	if !strings.Contains(prompt, "当前处于生成模式") || !strings.Contains(prompt, `"deadline"`) {
		t.Fatalf("generation prompt is missing mode or schema")
	}
}

func TestSuggestionPromptDoesNotAllowFabricatedAnswers(t *testing.T) {
	t.Parallel()

	agent, _ := Get("contribution")
	prompt, err := agent.Prompt(SuggestionMode)
	if err != nil {
		t.Fatalf("Prompt() error = %v", err)
	}
	if !strings.Contains(prompt, "用户回答辅助模式") || !strings.Contains(prompt, "latest_agent_question") || !strings.Contains(prompt, "不得虚构") {
		t.Fatalf("suggestion prompt is missing safety instructions")
	}
}

func TestStatusPromptRequiresStructuredAssessment(t *testing.T) {
	t.Parallel()

	agent, _ := Get("task")
	prompt, err := agent.Prompt(StatusMode)
	if err != nil {
		t.Fatalf("Prompt() error = %v", err)
	}
	if !strings.Contains(prompt, "对话状态评估模式") || !strings.Contains(prompt, `"covered"`) || !strings.Contains(prompt, `"submitReady"`) {
		t.Fatalf("status prompt is missing assessment schema")
	}
}
