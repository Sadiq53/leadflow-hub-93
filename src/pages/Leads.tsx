import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Lead {
  id: string;
  company_name: string;
  company_website: string | null;
  campaign: string | null;
  source: string | null;
  created_at: string;
  created_by?: string;
  tags: string[] | null;
  profiles?: {
    name: string;
  };
  pocs: { count: number }[];
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('id, company_name, company_website, campaign, source, created_at, tags, created_by, pocs(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const createdByIds = Array.from(new Set((leadsData || []).map((l: any) => l.created_by))).filter(Boolean);

      let profilesMap: Record<string, string> = {};
      if (createdByIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', createdByIds);
        profilesMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p.name]));
      }

      const withProfile = (leadsData || []).map((l: any) => ({
        ...l,
        profiles: { name: profilesMap[l.created_by] || 'Unknown' }
      }));
      setLeads(withProfile as unknown as Lead[]);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = leads.filter((lead) =>
    lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.campaign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.source?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground">
              Manage all your company contacts and outreach
            </p>
          </div>
          <Button onClick={() => navigate("/leads/new")} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, campaign, or source..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No leads found matching your search" : "No leads yet. Add your first lead to get started!"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>POCs</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/leads/${lead.id}`)}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{lead.company_name}</div>
                          {lead.company_website && (
                            <div className="text-xs text-muted-foreground">{lead.company_website}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.campaign ? (
                          <Badge variant="outline">{lead.campaign}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{lead.source || "—"}</TableCell>
                      <TableCell>
                        <Badge>{lead.pocs[0]?.count || 0}</Badge>
                      </TableCell>
                      <TableCell>{lead.profiles?.name || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(lead.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="flex items-center space-x-1"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Leads;
