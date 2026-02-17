import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { mockConnections, connectionUsers } from '@/data/mockMessages';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  MessageSquare,
  MoreHorizontal,
  Search,
  Briefcase,
  MapPin,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

const Connections = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState(mockConnections);
  const [suggestedConnections] = useState([
    {
      id: 's1',
      name: 'Ava Reynolds',
      company: 'BrightPath Labs',
      avatar: '/avatar-4.jpg',
      role: 'Growth Lead',
      mutualConnections: 6,
      reason: 'Complementary marketing expertise',
    },
    {
      id: 's2',
      name: 'Daniel Park',
      company: 'NextWave Capital',
      avatar: '/avatar-5.jpg',
      role: 'Investment Partner',
      mutualConnections: 9,
      reason: 'Invests in your sector',
    },
    {
      id: 's3',
      name: 'Lina Okafor',
      company: 'SupplyX',
      avatar: '/avatar-6.jpg',
      role: 'Operations Director',
      mutualConnections: 4,
      reason: 'Potential marketplace collaboration',
    },
  ]);

  const myConnections = connections.filter(
    c =>
      (c.senderId === user?.id || c.receiverId === user?.id) &&
      c.status === 'accepted'
  );

  const pendingConnections = connections.filter(
    c => c.receiverId === user?.id && c.status === 'pending'
  );

  const sentConnections = connections.filter(
    c => c.senderId === user?.id && c.status === 'pending'
  );

  const getFilteredConnections = (list: typeof mockConnections) => {
    return list.filter((conn) => {
      const otherUserId = conn.senderId === user?.id ? conn.receiverId : conn.senderId;
      const otherUser = connectionUsers.find(u => u.id === otherUserId);
      return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             otherUser?.company.toLowerCase().includes(searchQuery.toLowerCase());
    });
  };

  const handleAccept = (connectionId: string) => {
    setConnections(connections.map(c =>
      c.id === connectionId ? { ...c, status: 'accepted' as const } : c
    ));
  };

  const handleReject = (connectionId: string) => {
    setConnections(connections.map(c =>
      c.id === connectionId ? { ...c, status: 'rejected' as const } : c
    ));
  };

  const getOtherUser = (connection: typeof mockConnections[0]) => {
    const otherUserId = connection.senderId === user?.id ? connection.receiverId : connection.senderId;
    return connectionUsers.find(u => u.id === otherUserId);
  };

  const renderConnectionCard = (connection: typeof mockConnections[0], showActions = false) => {
    const otherUser = getOtherUser(connection);
    if (!otherUser) return null;

    return (
      <Card key={connection.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={otherUser.avatar} />
              <AvatarFallback className="bg-[var(--brand-primary)] text-white text-lg">
                {otherUser.name[0]}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{otherUser.name}</h3>
                  <p className="text-gray-500">{otherUser.role} at {otherUser.company}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Briefcase className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <UserX className="w-4 h-4 mr-2" />
                      Remove Connection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {connection.message && (
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                  "{connection.message}"
                </p>
              )}

              {showActions && connection.status === 'pending' && connection.receiverId === user?.id && (
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                    onClick={() => handleAccept(connection.id)}
                  >
                    <UserCheck className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(connection.id)}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              )}

              {connection.status === 'pending' && connection.senderId === user?.id && (
                <Badge variant="outline" className="mt-4">
                  Pending
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-[var(--brand-primary)]" />
            My Network
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your connections and grow your network
          </p>
        </div>
        <Button
          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
          onClick={() => navigate('/dashboard/profiles')}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Find Connections
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Connections</p>
                <p className="text-2xl font-bold">{myConnections.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-[var(--brand-primary)]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Requests</p>
                <p className="text-2xl font-bold">{pendingConnections.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sent Requests</p>
                <p className="text-2xl font-bold">{sentConnections.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Connections */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Suggested Connections</h3>
              <p className="text-sm text-gray-600">
                People who match your business interests
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/profiles')}>
              Browse Profiles
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {suggestedConnections.map((person) => (
              <Card key={person.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback className="bg-[var(--brand-primary)] text-white">
                        {person.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{person.name}</p>
                      <p className="text-xs text-gray-500 truncate">{person.role}</p>
                      <p className="text-xs text-gray-500 truncate">{person.company}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {person.mutualConnections} mutual
                    </Badge>
                    <Button size="sm" variant="outline">
                      Connect
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{person.reason}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search connections by name or company..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({getFilteredConnections(myConnections).length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({getFilteredConnections(pendingConnections).length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({getFilteredConnections(sentConnections).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {getFilteredConnections(myConnections).length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No connections yet</h3>
              <p className="text-gray-600 mb-4">Start building your network by connecting with other businesses</p>
              <Button
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                onClick={() => navigate('/dashboard/profiles')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Find Connections
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {getFilteredConnections(myConnections).map((conn) =>
                renderConnectionCard(conn)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {getFilteredConnections(pendingConnections).length === 0 ? (
            <Card className="p-12 text-center">
              <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
              <p className="text-gray-600">You are all caught up!</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {getFilteredConnections(pendingConnections).map((conn) =>
                renderConnectionCard(conn, true)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {getFilteredConnections(sentConnections).length === 0 ? (
            <Card className="p-12 text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No sent requests</h3>
              <p className="text-gray-600">You haven't sent any connection requests yet</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {getFilteredConnections(sentConnections).map((conn) =>
                renderConnectionCard(conn)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Connections;
