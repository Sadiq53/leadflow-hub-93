import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Template {
  id: string;
  name: string;
  body: string;
  is_shared: boolean;
  followup_day?: number | null;
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
            Use {'{'}firstName{'}'}, {'{'}company{'}'}, {'{'}title{'}'} as placeholders. 
            Assign a Follow-up Day to automatically use this template when messaging members on that day.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input 
              id="name" 
              name="name" 
              placeholder="e.g., Day 1 - Initial Connection" 
              defaultValue={editingTemplate?.name}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followup_day">Follow-up Day Assignment</Label>
            <Select name="followup_day" defaultValue={editingTemplate?.followup_day?.toString() || ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select which day to use this template..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not assigned to a day</SelectItem>
                <SelectItem value="1">Day 1 - First Follow-up (same day as acknowledgment)</SelectItem>
                <SelectItem value="2">Day 2 - Second Follow-up (+1 day after acknowledgment)</SelectItem>
                <SelectItem value="3">Day 3 - Third Follow-up (+2 days after acknowledgment)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When you click "Send Message" in Today's Tasks, the system will automatically copy the template assigned to that member's follow-up day.
            </p>
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
