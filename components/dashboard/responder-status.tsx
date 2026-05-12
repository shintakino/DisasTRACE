import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Responder } from "@/types/dashboard";

export function ResponderStatus({ responders }: { responders: Responder[] }) {
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return 'bg-green-100 text-green-700';
      case 'DISPATCHED':
        return 'bg-blue-100 text-blue-700';
      case 'ON-SCENE':
        return 'bg-orange-100 text-orange-700';
      case 'EN-ROUTE':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-navy-900">Responders</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 p-1">
            {responders.map((responder) => (
              <div
                key={responder.id}
                className="flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer min-w-[120px]"
              >
                <Avatar className="h-12 w-12 mb-3 bg-navy-900 text-white">
                  <AvatarFallback className="bg-navy-900 text-white font-bold">
                    {responder.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-bold text-navy-900 text-center mb-2 truncate w-full">
                  {responder.name}
                </span>
                <Badge className={`${getStatusColor(responder.status)} border-none text-[10px] px-2 py-0.5`}>
                  {responder.status}
                </Badge>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
