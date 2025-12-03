import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Search, Eye, Filter, X, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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

interface Profile {
  id: string;
  name: string;
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  // Extract unique campaigns and sources for filters
  const campaigns = Array.from(new Set(leads.map(l => l.campaign).filter(Boolean))) as string[];
  const sources = Array.from(new Set(leads.map(l => l.source).filter(Boolean))) as string[];

  useEffect(() => {
    fetchLeads();
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('id, name');
    setProfiles(data || []);
  };

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

  const filteredLeads = leads.filter((lead) => {
    // Text search
    const matchesSearch = lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.campaign?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.source?.toLowerCase().includes(searchQuery.toLowerCase());

    // User filter
    const matchesUser = filterUser === "all" || lead.created_by === filterUser;

    // Campaign filter
    const matchesCampaign = filterCampaign === "all" || lead.campaign === filterCampaign;

    // Source filter
    const matchesSource = filterSource === "all" || lead.source === filterSource;

    // Date range filter
    const leadDate = new Date(lead.created_at);
    const matchesDateFrom = !dateFrom || isAfter(leadDate, startOfDay(dateFrom)) || leadDate.toDateString() === dateFrom.toDateString();
    const matchesDateTo = !dateTo || isBefore(leadDate, endOfDay(dateTo)) || leadDate.toDateString() === dateTo.toDateString();

    return matchesSearch && matchesUser && matchesCampaign && matchesSource && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setFilterUser("all");
    setFilterCampaign("all");
    setFilterSource("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
  };

  const hasActiveFilters = filterUser !== "all" || filterCampaign !== "all" || filterSource !== "all" || dateFrom || dateTo;

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
            <div className="space-y-4">
              {/* Search and Filter Toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by company, campaign, or source..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="h-4 w-4" />
                  {hasActiveFilters && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Filter Controls */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
                  {/* User Filter */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Created By</label>
                    <Select value={filterUser} onValueChange={setFilterUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campaign Filter */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Campaign</label>
                    <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Campaigns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Campaigns</SelectItem>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign} value={campaign}>
                            {campaign}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source Filter */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Source</label>
                    <Select value={filterSource} onValueChange={setFilterSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        {sources.map((source) => (
                          <SelectItem key={source} value={source}>
                            {source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">From Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateFrom && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Date To */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">To Date</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateTo && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* Results Count */}
              {!loading && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredLeads.length} of {leads.length} leads
                  {hasActiveFilters && " (filtered)"}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || hasActiveFilters ? "No leads found matching your filters" : "No leads yet. Add your first lead to get started!"}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/leads/${lead.id}`);
                          }}
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