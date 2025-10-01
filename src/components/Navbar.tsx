import React from 'react';
import { Database, PersonStanding, Shield } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: 'check' | 'scan' | 'upload' | 'status' | 'super' | 'coachoperator' | 'othercoach' | 'othercoachstatus' | 'otherarrival') => void;
}

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const handleTabChange = (tab: 'check' | 'scan' | 'upload' | 'status' | 'super' | 'coachoperator' | 'othercoach' | 'othercoachstatus' | 'otherarrival') => {
    onTabChange(tab);
  };

  return (
    <div className="bg-white shadow-md">
      {/* Main Navbar */}
      <nav className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img src="/icons/Logo1.png" alt="Logo" className="h-8" />
          </div>

          {/* Tabs (Visible on larger screens) */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {/* <button
              onClick={() => handleTabChange('super')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'super'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Super Admin"
            >
              <Shield className="w-5 h-5 mr-3" />
              <span>Super Admin</span>
            </button> */}

            <button
              onClick={() => handleTabChange('check')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'check'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Dispatch Staff"
            >
              <PersonStanding className="w-5 h-5 mr-3" />
              <span>Coach Dispatcher</span>
            </button>

            <button
              onClick={() => handleTabChange('status')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'status'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Coach Operator"
            >
              <PersonStanding className="w-5 h-5 mr-3" />
              <span>Coach Operator</span>
            </button>

            {/* <button
              onClick={() => handleTabChange('scan')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'scan'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Arrival Staff"
            >
              <PersonStanding className="w-5 h-5 mr-3" />
              <span>Arrival Gate Staff</span>
            </button> */}

            <button
              onClick={() => handleTabChange('otherarrival')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'otherarrival'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Other Arrival Staff"
            >
              <PersonStanding className="w-5 h-5 mr-3" />
              <span>Arrival Gate Staff</span>
            </button>

            <button
              onClick={() => handleTabChange('upload')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all ${
                activeTab === 'upload'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Data Management"
            >
              <Database className="w-5 h-5 mr-3" />
              <span>Data Management</span>
            </button>
          </div>
        </div>

        {/* Collapsible Content (Vertical layout on small screens) */}
        <div className="lg:hidden">
          <div className="flex flex-col space-y-2 py-2 bg-gray-50">
            {/* <button
              onClick={() => handleTabChange('super')}
              className={`flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'super'
                  ? 'bg-purple-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Super Admin"
            >
              <Shield className="w-5 h-5 mr-2" />
              <span>Super Admin</span>
            </button> */}

            <button
              onClick={() => handleTabChange('check')}
              className={`flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'check'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Dispatch Staff"
            >
              <PersonStanding className="w-5 h-5 mr-2" />
              <span>Coach Dispatcher</span>
            </button>
            <button
              onClick={() => handleTabChange('status')}
              className={`flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'status'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Coach Operator"
            >
              <PersonStanding className="w-5 h-5 mr-2" />
              <span>Coach Operator</span>
            </button>

            {/* <button
              onClick={() => handleTabChange('scan')}
              className={`flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'scan'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Arrival Staff"
            >
              <PersonStanding className="w-5 h-5 mr-2" />
              <span>Arrival Gate Staff</span>
            </button> */}

            <button
              onClick={() => handleTabChange('otherarrival')}
              className={`flex items-center px-3 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'otherarrival'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Other Arrival Staff"
            >
              <PersonStanding className="w-5 h-5 mr-2" />
              <span>Arrival Gate Staff</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}