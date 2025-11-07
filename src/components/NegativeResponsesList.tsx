import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ThumbsDown, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface NegativeMember {
  id: string;
  name: string;
  company_name: string;
  linkedin_url: string | null;
  response: string | null;
  created_at: string;
}

const NegativeResponsesList = () => {
  const [negativeMembers, setNegativeMembers] = useState<NegativeMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNegativeResponses();
  }, []);

  const fetchNegativeResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('pocs')
        .select('id, name, linkedin_url, response, created_at, leads(company_name)')
        .eq('response_type', 'negative')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((poc: any) => ({
        id: poc.id,
        name: poc.name,
        company_name: poc.leads?.company_name || 'Unknown',
        linkedin_url: poc.linkedin_url,
        response: poc.response,
        created_at: poc.created_at,
      }));

      setNegativeMembers(formatted);
    } catch (error) {
      console.error('Error fetching negative responses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Negative Responses</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <ThumbsDown className="h-5 w-5 text-destructive" />
              <span>Negative Responses</span>
            </CardTitle>
            <CardDescription>
              Members who declined or showed no interest
            </CardDescription>
          </div>
          <Badge variant="destructive">{negativeMembers.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {negativeMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No negative responses yet
          </p>
        ) : (
          <div className="space-y-3">
            {negativeMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-sm">{member.name}</h4>
                    <Badge variant="outline" className="flex items-center">
                      <Building2 className="h-3 w-3 mr-1" />
                      {member.company_name}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Declined on {format(new Date(member.created_at), 'MMM d, yyyy')}
                  </p>
                  {member.response && (
                    <p className="text-xs text-muted-foreground italic mt-1">
                      "{member.response}"
                    </p>
                  )}
                </div>
                {member.linkedin_url && (
                  <a
                    href={member.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    View Profile
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NegativeResponsesList;
