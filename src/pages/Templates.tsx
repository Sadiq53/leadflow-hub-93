import { useEffect, useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TemplateCard } from "@/components/templates/TemplateCard";
import { TemplateDialog } from "@/components/templates/TemplateDialog";
import { TemplateFilters } from "@/components/templates/TemplateFilters";

interface Template {
  id: string;
  name: string;
  body: string;
  is_shared: boolean;
  created_at: string;
  created_by: string;
  followup_day?: number | null;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const fetchTemplates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('templates')
      .select('*')
      .or(`created_by.eq.${user.id},is_shared.eq.true`)
      .order('created_at', { ascending: false });

    if (data) setTemplates(data);
  };

  const handleSubmitTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const body = formData.get('body') as string;
    const isShared = formData.get('is_shared') === 'on';
    const followupDay = formData.get('followup_day') as string;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (editingTemplate) {
      const { error } = await supabase
        .from('templates')
        .update({ 
          name, 
          body, 
          is_shared: isShared,
          followup_day: followupDay ? parseInt(followupDay) : null
        })
        .eq('id', editingTemplate.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update template",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Template updated successfully"
        });
        setIsDialogOpen(false);
        setEditingTemplate(null);
        fetchTemplates();
      }
    } else {
      const { error } = await supabase
        .from('templates')
        .insert({
          name,
          body,
          is_shared: isShared,
          followup_day: followupDay ? parseInt(followupDay) : null,
          created_by: user.id
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create template",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Success",
          description: "Template created successfully"
        });
        setIsDialogOpen(false);
        fetchTemplates();
      }
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  const handleCopyTemplate = async (template: Template) => {
    try {
      await navigator.clipboard.writeText(template.body);
      toast({
        title: "Copied!",
        description: "Template copied to clipboard"
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = template.body;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Copied!",
        description: "Template copied to clipboard"
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Template deleted"
      });
      fetchTemplates();
    }
  };

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by ownership
    if (filterBy === "mine") {
      filtered = filtered.filter(t => t.created_by === currentUserId);
    } else if (filterBy === "shared") {
      filtered = filtered.filter(t => t.is_shared);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => t.name.toLowerCase().includes(query) || 
             t.body.toLowerCase().includes(query)
      );
    }

    // Sort
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              currentUserId={currentUserId}
              onCopy={handleCopyTemplate}
              onDelete={handleDeleteTemplate}
              onEdit={handleEditTemplate}
            />
          ))}
        </div>

        {filteredAndSortedTemplates.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery || filterBy !== "all"
                  ? "No templates match your filters."
                  : "No templates yet. Create your first template to get started!"}
              </p>
            </CardContent>
          </Card>
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
