import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Edit } from "lucide-react";

interface Template {
  id: string;
  name: string;
  body: string;
  is_shared: boolean;
  created_at: string;
  created_by: string;
}

interface TemplateCardProps {
  template: Template;
  currentUserId: string;
  onCopy: (template: Template) => void;
  onDelete: (id: string) => void;
  onEdit: (template: Template) => void;
}

export const TemplateCard = ({ template, currentUserId, onCopy, onDelete, onEdit }: TemplateCardProps) => {
  const isOwner = template.created_by === currentUserId;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">{template.name}</span>
          {template.is_shared && <Badge variant="secondary">Shared</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto border rounded p-2">
            {template.body}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 flex items-center justify-center gap-2"
              onClick={() => onCopy(template)}
            >
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </Button>
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
