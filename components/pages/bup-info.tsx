'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { 
  GraduationCap, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  BookOpen, 
  Award,
  Building,
  Shield
} from 'lucide-react';

interface BUPInfoProps {
  onNavigate: (page: string) => void;
}

export default function BUPInfo({ onNavigate }: BUPInfoProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-[#1B4D3E]/10 to-[#1B4D3E]/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Image 
                src="/bup-logo.png" 
                alt="Bangladesh University of Professionals Logo" 
                width={120} 
                height={120} 
                className="rounded-lg shadow-lg"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Bangladesh University of Professionals
            </h1>
            <p className="text-xl text-muted-foreground mb-6 max-w-3xl mx-auto">
              Leading the way in professional education, defense studies, and academic excellence in Bangladesh since 2008
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="bg-[#1B4D3E]/10 text-[#1B4D3E] border-[#1B4D3E]/20">
                Est. 2008
              </Badge>
              <Badge variant="secondary" className="bg-[#1B4D3E]/10 text-[#1B4D3E] border-[#1B4D3E]/20">
                Government University
              </Badge>
              <Badge variant="secondary" className="bg-[#1B4D3E]/10 text-[#1B4D3E] border-[#1B4D3E]/20">
                UGC Approved
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Campus Info */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Campus Information</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#1B4D3E]" />
                  Location & Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-[#1B4D3E]">Main Campus</h4>
                    <p className="text-muted-foreground">VIP Road, Mirpur Cantonment, Dhaka-1216, Bangladesh</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1B4D3E]">Additional Campus</h4>
                    <p className="text-muted-foreground">Baridhara, Dhaka, Bangladesh</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-[#1B4D3E]" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>+88024-9870-5700</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>info@bup.edu.bd</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>www.bup.edu.bd</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Academic Programs */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8">Academic Programs</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="text-center shadow-md border-[#1B4D3E]/20">
                <CardContent className="p-6">
                  <Shield className="h-12 w-12 text-[#1B4D3E] mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Defense & Strategic Studies</h4>
                  <p className="text-sm text-muted-foreground">Security, Defense Policy, International Relations</p>
                </CardContent>
              </Card>

              <Card className="text-center shadow-md border-[#1B4D3E]/20">
                <CardContent className="p-6">
                  <Building className="h-12 w-12 text-[#1B4D3E] mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Engineering</h4>
                  <p className="text-sm text-muted-foreground">Computer Science, Civil, Electrical, Mechanical</p>
                </CardContent>
              </Card>

              <Card className="text-center shadow-md border-[#1B4D3E]/20">
                <CardContent className="p-6">
                  <GraduationCap className="h-12 w-12 text-[#1B4D3E] mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Business Administration</h4>
                  <p className="text-sm text-muted-foreground">MBA, BBA, Marketing, Finance</p>
                </CardContent>
              </Card>

              <Card className="text-center shadow-md border-[#1B4D3E]/20">
                <CardContent className="p-6">
                  <BookOpen className="h-12 w-12 text-[#1B4D3E] mx-auto mb-4" />
                  <h4 className="font-semibold mb-2">Arts & Sciences</h4>
                  <p className="text-sm text-muted-foreground">English, Mathematics, Physics, Chemistry</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Campus Facilities */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-center mb-8">Campus Facilities</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1B4D3E]">Academic Facilities</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Modern Classrooms</li>
                    <li>• Central Library</li>
                    <li>• Computer Labs</li>
                    <li>• Engineering Labs</li>
                    <li>• Research Centers</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1B4D3E]">Student Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Residential Halls</li>
                    <li>• Medical Center</li>
                    <li>• Counseling Services</li>
                    <li>• Career Guidance</li>
                    <li>• Student Activities</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-[#1B4D3E]">Recreation & Sports</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li>• Sports Complex</li>
                    <li>• Gymnasium</li>
                    <li>• Outdoor Courts</li>
                    <li>• Cafeteria</li>
                    <li>• Common Areas</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Safety & Security */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-6">Campus Safety & Security</h3>
            <Card className="max-w-4xl mx-auto shadow-lg bg-gradient-to-r from-[#1B4D3E]/5 to-[#1B4D3E]/10">
              <CardContent className="p-8">
                <p className="text-lg mb-6">
                  BUP is committed to providing a safe and secure environment for all students, faculty, and staff. 
                  Our comprehensive safety platform ensures 24/7 protection and support.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg"
                    onClick={() => onNavigate('emergency')}
                    className="bg-[#1B4D3E] hover:bg-[#1B4D3E]/90 text-white"
                  >
                    Report Emergency
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => onNavigate('safety-resources')}
                    className="border-[#1B4D3E] text-[#1B4D3E]"
                  >
                    View Safety Resources
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
