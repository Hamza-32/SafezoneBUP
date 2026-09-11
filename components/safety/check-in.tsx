'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin, AlertTriangle, CheckCircle, Phone, Plus, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';

interface SafetyCheckin {
  id: number;
  userId: number;
  checkinTime: string;
  expectedArrivalTime: string;
  location: string;
  status: 'pending' | 'arrived' | 'missed' | 'alerted';
  sosTriggered: boolean;
  emergencyContactName?: string;
  notes: string;
}

interface EmergencyContact {
  id: number;
  name: string;
  phoneNumber: string;
  email?: string;
  department?: string;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  arrived: 'bg-green-100 text-green-800',
  missed: 'bg-red-100 text-red-800',
  alerted: 'bg-orange-100 text-orange-800'
};

const statusIcons = {
  pending: Clock,
  arrived: CheckCircle,
  missed: AlertTriangle,
  alerted: Phone
};

export default function SafetyCheckin() {
  const [checkins, setCheckins] = useState<SafetyCheckin[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [showNewCheckinDialog, setShowNewCheckinDialog] = useState(false);
  const [newCheckin, setNewCheckin] = useState({
    expectedArrivalTime: '',
    location: '',
    emergencyContactId: '',
    notes: ''
  });

  useEffect(() => {
    fetchCheckins();
    fetchContacts();
  }, []);

  // The server scopes every check-in to the signed-in user, so no user id is
  // sent from here. A 401 means the visitor is not signed in.
  const fetchCheckins = async () => {
    try {
      const result = await apiClient.getCheckins();
      setCheckins(result.data || []);
      setRequiresSignIn(false);
    } catch (error: any) {
      if (error?.status === 401) {
        setRequiresSignIn(true);
      } else {
        console.error('Error fetching checkins:', error);
        toast.error('Could not load your check-ins.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const result = await apiClient.getEmergencyContacts();
      setContacts(result.data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const handleCreateCheckin = async () => {
    if (!newCheckin.expectedArrivalTime || !newCheckin.location) {
      toast.error('Please fill in the required fields');
      return;
    }

    try {
      await apiClient.createCheckin({
        expectedArrivalTime: newCheckin.expectedArrivalTime,
        location: newCheckin.location,
        emergencyContactId: newCheckin.emergencyContactId
          ? Number(newCheckin.emergencyContactId)
          : undefined,
        notes: newCheckin.notes || undefined,
      });

      setNewCheckin({
        expectedArrivalTime: '',
        location: '',
        emergencyContactId: '',
        notes: '',
      });
      setShowNewCheckinDialog(false);
      fetchCheckins();
      toast.success('Safety check-in created');
    } catch (error: any) {
      console.error('Error creating checkin:', error);
      toast.error(error?.message || 'Failed to create check-in');
    }
  };

  const handleUpdateCheckin = async (id: number, status: string) => {
    try {
      await apiClient.updateCheckin(id, status);
      fetchCheckins();
    } catch (error: any) {
      console.error('Error updating checkin:', error);
      toast.error(error?.message || 'Failed to update check-in');
    }
  };

  const handleSOSAlert = async (id: number) => {
    if (!confirm('This will alert campus security. Are you sure?')) return;

    try {
      await apiClient.updateCheckin(id, 'alerted', true);
      fetchCheckins();
      // Deliberately specific: the alert reaches responders inside the app,
      // it does not place a call or send a text message.
      toast.success('SOS raised. Campus security has been notified in the app.');
    } catch (error: any) {
      console.error('Error sending SOS alert:', error);
      toast.error(
        error?.message || 'Could not raise the SOS. Call campus security directly.'
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Check-ins are personal data, so there is nothing to show a visitor who
  // is not signed in.
  if (requiresSignIn) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to use safety check-ins</h2>
          <p className="text-gray-500 max-w-md mx-auto">
            A check-in records where you are heading and when you expect to arrive, so campus
            security can act if you do not check in. Sign in to create one.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Safety Check-In System</h2>
          <p className="text-gray-600">Let others know when to expect you and get help if needed</p>
        </div>
        
        <Dialog open={showNewCheckinDialog} onOpenChange={setShowNewCheckinDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Check-In
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Safety Check-In</DialogTitle>
              <DialogDescription>
                Set up a safety check-in for when you&apos;re traveling alone or in potentially unsafe situations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Expected Arrival Time</label>
                <Input
                  type="datetime-local"
                  value={newCheckin.expectedArrivalTime}
                  onChange={(e) => setNewCheckin({...newCheckin, expectedArrivalTime: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Location/Destination</label>
                <Input
                  placeholder="Where are you going?"
                  value={newCheckin.location}
                  onChange={(e) => setNewCheckin({...newCheckin, location: e.target.value})}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Emergency Contact</label>
                <Select value={newCheckin.emergencyContactId} onValueChange={(value) => setNewCheckin({...newCheckin, emergencyContactId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an emergency contact" />
                  </SelectTrigger>
                  <SelectContent>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.name} - {contact.phoneNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (Optional)</label>
                <Textarea
                  placeholder="Additional details about your trip..."
                  rows={3}
                  value={newCheckin.notes}
                  onChange={(e) => setNewCheckin({...newCheckin, notes: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewCheckinDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCheckin}>
                  Create Check-In
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Check-ins */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Check-ins</h3>
        {checkins.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">No recent check-ins found.</p>
              <p className="text-sm text-gray-400 mt-2">Create your first safety check-in above!</p>
            </CardContent>
          </Card>
        ) : (
          checkins.map((checkin) => {
            const StatusIcon = statusIcons[checkin.status];
            const statusColor = statusColors[checkin.status];
            const expectedTime = new Date(checkin.expectedArrivalTime);
            const isOverdue = checkin.status === 'pending' && new Date() > expectedTime;

            return (
              <Card key={checkin.id} className={`${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <CardTitle className="text-base">{checkin.location}</CardTitle>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>Expected: {expectedTime.toLocaleString()}</span>
                      </div>
                      {checkin.emergencyContactName && (
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Phone className="h-3 w-3" />
                          <span>Contact: {checkin.emergencyContactName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={statusColor}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {checkin.status}
                      </Badge>
                      {isOverdue && (
                        <Badge className="bg-red-100 text-red-800">
                          Overdue
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {checkin.notes && (
                    <p className="text-gray-700 mb-4">{checkin.notes}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {checkin.status === 'pending' && (
                        <>
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateCheckin(checkin.id, 'arrived')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            I&apos;ve Arrived
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSOSAlert(checkin.id)}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            SOS
                          </Button>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Created: {new Date(checkin.checkinTime).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
