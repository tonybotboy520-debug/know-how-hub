package skills

import (
	"strings"
	"testing"
)

func TestLoadBundledSkills(t *testing.T) {
	t.Parallel()

	names := []string{
		"clarify-knowhow-task",
		"interview-practice-contribution",
		"create-practice-knowhow",
		"plan-knowhow-iteration",
	}
	for _, name := range names {
		document, err := Load(name)
		if err != nil {
			t.Fatalf("Load(%q) error = %v", name, err)
		}
		if document.Name != name {
			t.Fatalf("Load(%q).Name = %q", name, document.Name)
		}
		if strings.Contains(document.Instructions, "TODO") {
			t.Fatalf("Load(%q) still contains TODO", name)
		}
		if !strings.Contains(document.Instructions, "## 生成模式") {
			t.Fatalf("Load(%q) is missing generation instructions", name)
		}
	}
}

func TestLoadRejectsInvalidName(t *testing.T) {
	t.Parallel()

	if _, err := Load("../secret"); err == nil {
		t.Fatal("expected invalid skill name error")
	}
}
