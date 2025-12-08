import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useTemplates, Template } from "@/hooks/useTemplates";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { TemplateFilters } from "@/components/templates/TemplateFilters";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";
import { useAuth } from "@/hooks/useAuth";

const Templates = () => {
  const { user } = useAuth();
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, copyTemplate, isCreating, isUpdating } = useTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");

  const currentUserId = user?.id || "";

  const handleSubmitTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const body = formData.get('body') as string;
    const isShared = formData.get('is_shared') === 'on';
    const followupDayRaw = formData.get('followup_day') as string;
    const followupDay = followupDayRaw && followupDayRaw !== 'none' ? parseInt(followupDayRaw) : null;

    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, name, body, is_shared: isShared, followup_day: followupDay });
    } else {
      createTemplate({ name, body, is_shared: isShared, followup_day: followupDay });
    }
    
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    deleteTemplate(id);
  };

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    if (filterBy === "mine") {
      filtered = filtered.filter(t => t.created_by === currentUserId);
    } else if (filterBy === "shared") {
      filtered = filtered.filter(t => t.is_shared);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) || 
             t.body.toLowerCase().includes(query)
      );
    }

    const sorted = [...filtered];
    if (sortBy === "newest") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [templates, searchQuery, sortBy, filterBy, currentUserId]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Message Templates</h1>
            <p className="text-muted-foreground">
              Create reusable message templates with placeholders like {'{'}firstName{'}'} and {'{'}company{'}'}
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </Button>
        </div>

        <TemplateFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
        />

        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <LoadingSpinner text="Loading templates..." />
            </CardContent>
          </Card>
        ) : filteredAndSortedTemplates.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptyState
                title={searchQuery || filterBy !== "all" ? "No templates match your filters" : "No templates yet"}
                description={searchQuery || filterBy !== "all" ? "Try adjusting your search or filters." : "Create your first template to get started!"}
                action={!searchQuery && filterBy === "all" ? {
                  label: "Create Template",
                  onClick: () => setIsDialogOpen(true)
                } : undefined}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                currentUserId={currentUserId}
                onCopy={copyTemplate}
                onDelete={handleDeleteTemplate}
                onEdit={handleEditTemplate}
              />
            ))}
          </div>
        )}

        <TemplateDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleSubmitTemplate}
          editingTemplate={editingTemplate}
        />
      </div>
    </Layout>
  );
};

export default Templates;
