package skills

import (
	"embed"
	"fmt"
	"strings"
)

//go:embed */SKILL.md
var documents embed.FS

type Document struct {
	Name         string
	Description  string
	Instructions string
}

func Load(name string) (Document, error) {
	if name == "" || strings.ContainsAny(name, `/\\`) || strings.Contains(name, "..") {
		return Document{}, fmt.Errorf("invalid skill name %q", name)
	}

	content, err := documents.ReadFile(name + "/SKILL.md")
	if err != nil {
		return Document{}, fmt.Errorf("load skill %q: %w", name, err)
	}
	return parseDocument(string(content))
}

func parseDocument(content string) (Document, error) {
	normalized := strings.ReplaceAll(content, "\r\n", "\n")
	if !strings.HasPrefix(normalized, "---\n") {
		return Document{}, fmt.Errorf("skill document is missing YAML frontmatter")
	}
	remainder := strings.TrimPrefix(normalized, "---\n")
	frontmatterEnd := strings.Index(remainder, "\n---\n")
	if frontmatterEnd < 0 {
		return Document{}, fmt.Errorf("skill document has incomplete YAML frontmatter")
	}

	document := Document{Instructions: strings.TrimSpace(remainder[frontmatterEnd+5:])}
	for _, line := range strings.Split(remainder[:frontmatterEnd], "\n") {
		key, value, ok := strings.Cut(line, ":")
		if !ok {
			continue
		}
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		switch strings.TrimSpace(key) {
		case "name":
			document.Name = value
		case "description":
			document.Description = value
		}
	}
	if document.Name == "" || document.Description == "" || document.Instructions == "" {
		return Document{}, fmt.Errorf("skill document is missing name, description, or instructions")
	}
	return document, nil
}
