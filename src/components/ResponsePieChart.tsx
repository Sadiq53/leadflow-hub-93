import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ResponseData {
  name: string;
  value: number;
  color: string;
}

const ResponsePieChart = () => {
  const [data, setData] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get POCs from leads created by this user
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .eq('created_by', user.id);

      if (!leads || leads.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const leadIds = leads.map(l => l.id);
      
      const { data: pocs } = await supabase
        .from('pocs')
        .select('response_type')
        .in('lead_id', leadIds);

      if (pocs) {
        const positive = pocs.filter(p => p.response_type === 'positive').length;
        const negative = pocs.filter(p => p.response_type === 'negative').length;
        const neutral = pocs.filter(p => p.response_type === 'neutral').length;
        const noResponse = pocs.filter(p => p.response_type === 'no_response' || !p.response_type).length;

        setData([
          { name: 'Positive', value: positive, color: 'hsl(142, 76%, 36%)' },
          { name: 'Negative', value: negative, color: 'hsl(0, 84%, 60%)' },
          { name: 'Neutral', value: neutral, color: 'hsl(48, 96%, 53%)' },
          { name: 'No Response', value: noResponse, color: 'hsl(215, 16%, 47%)' },
        ]);
      }
    } catch (error) {
      console.error('Error fetching response data:', error);
    } finally {
      setLoading(false);
    }
  };

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Response Distribution</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Response Distribution</CardTitle>
        <CardDescription>Your contacts by response type</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-center text-muted-foreground py-8">No response data yet</p>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, '']}
                />
                <Legend 
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponsePieChart;
