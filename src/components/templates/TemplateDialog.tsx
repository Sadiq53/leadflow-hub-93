import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Template {
  id: string;
  name: string;
  body: string;
  is_shared: boolean;
}

interface TemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  editingTemplate: Template | null;
}

export const TemplateDialog = ({ isOpen, onClose, onSubmit, editingTemplate }: TemplateDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Message Template'}</DialogTitle>
          <DialogDescription>
            Use {'{'}firstName{'}'}, {'{'}company{'}'}, {'{'}title{'}'} as placeholders
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Initial Connection Request" 
              defaultValue={editingTemplate?.name}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message Body</Label>
            <Textarea
              id="body"
              name="body"
              placeholder="Hi {firstName}, I noticed your work at {company}..."
              rows={8}
              defaultValue={editingTemplate?.body}
              required
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch 
              id="is_shared" 
              name="is_shared" 
              defaultChecked={editingTemplate?.is_shared}
            />
            <Label htmlFor="is_shared">Share with team</Label>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
