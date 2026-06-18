"use client"

import * as React from "react"
import { RosterTable } from "@/components/roster/roster-table"
import { RosterSearch } from "@/components/roster/roster-search"
import { RosterFilter } from "@/components/roster/roster-filter"
import { RosterEntry, RosterFilter as RosterFilterType } from "@/types/roster"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Plus, Trash2, UserX, User, MapPin, ShieldCheck, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

import { toast } from "sonner"

export default function RosterPage() {
  const [data, setData] = React.useState<RosterEntry[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filters, setFilters] = React.useState<RosterFilterType>({})

  const [userToDelete, setUserToDelete] = React.useState<RosterEntry | null>(null)
  const [userToBan, setUserToBan] = React.useState<RosterEntry | null>(null)
  const [banAction, setBanAction] = React.useState<'SUSPENDED' | 'DEACTIVATED'>('SUSPENDED')

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [newResponder, setNewResponder] = React.useState({
    firstName: '',
    middleName: '',
    surname: '',
    suffixName: '',
    gender: '',
    email: '',
    mobileNumber: '',
    province: 'Bulacan',
    city: 'Baliwag City',
    responderType: 'cdrrmo_hq', // 'cdrrmo_hq' | 'barangay'
    barangay: '',
    street: '',
    password: '',
    confirmPassword: ''
  })
  const [addError, setAddError] = React.useState('')

  const barangays = [
    "Bagong Nayon", "Barangca", "Bonga Mayor", "Bonga Menor", "Catulinan", 
    "Concepcion", "Hinukay", "Makinabang", "Matangtubig", "Pagala", "Paitan", 
    "Piel", "Pinagbarilan", "Poblacion", "Sabang", "San Jose", "San Roque", 
    "Santa Barbara", "Santo Cristo", "Santo Niño", "Subic", "Sulivan", 
    "Tangos", "Tarcan", "Tiaong", "Tibag", "Virgen delas Flores"
  ]

  const fetchRosterData = React.useCallback(async () => {
    try {
      const response = await fetch('/api/roster')
      const json = await response.json()

      if (response.ok) {
        setData(json.data)
      } else {
        setError(json.message || "Failed to fetch roster data")
      }
    } catch (err) {
      console.error("Failed to fetch roster data:", err)
      setError("A network error occurred while loading roster data.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchRosterData()
  }, [fetchRosterData])

  const filteredData = React.useMemo(() => {
    let result = [...data]

    // Apply Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.fullName.toLowerCase().includes(query) ||
          item.email.toLowerCase().includes(query)
      )
    }

    // Apply Filters
    if (filters.status) {
      result = result.filter((item) => item.status === filters.status)
    }

    return result
  }, [searchQuery, filters, data])

  const handleDelete = React.useCallback((id: string) => {
    const user = data.find((item) => item.id === id)
    if (user) {
      setUserToDelete(user)
    }
  }, [data])

  const handleManage = React.useCallback((id: string) => {
    const user = data.find((item) => item.id === id)
    if (user) {
      setUserToBan(user)
    }
  }, [data])

  const confirmDelete = async () => {
    if (!userToDelete) return
    try {
      const response = await fetch(`/api/users?id=${userToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success(`Responder ${userToDelete.fullName} deleted successfully`)
        fetchRosterData()
      } else {
        const err = await response.json()
        toast.error(err.error || "Failed to delete responder")
      }
    } catch (err) {
      console.error("Failed to delete responder:", err)
      toast.error("Failed to delete responder")
    } finally {
      setUserToDelete(null)
    }
  }

  const confirmBan = async () => {
    if (!userToBan) return
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userToBan.id,
          status: banAction,
          rejectionReason: "Administrative action on responder roster",
        }),
      })

      if (response.ok) {
        toast.success(`Responder ${userToBan.fullName} updated to ${banAction}`)
        fetchRosterData()
      } else {
        const err = await response.json()
        toast.error(err.error || "Failed to update responder status")
      }
    } catch (err) {
      console.error("Failed to update responder status:", err)
      toast.error("Failed to update responder status")
    } finally {
      setUserToBan(null)
      setBanAction('SUSPENDED')
    }
  }
  const handleAddResponder = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    
    const isBarangay = newResponder.responderType === 'barangay';
    if (!newResponder.firstName || !newResponder.surname || !newResponder.gender || !newResponder.email || !newResponder.mobileNumber || (isBarangay && !newResponder.barangay) || !newResponder.street || !newResponder.password) {
      setAddError("Please fill in all required fields.")
      return
    }
    
    if (newResponder.password !== newResponder.confirmPassword) {
      setAddError("Passwords do not match.")
      return
    }
    
    const fullName = `${newResponder.surname}, ${newResponder.firstName}${newResponder.middleName ? ' ' + newResponder.middleName : ''}${newResponder.suffixName ? ' ' + newResponder.suffixName : ''}`
    const fullAddress = isBarangay 
      ? `${newResponder.street}, ${newResponder.barangay}, ${newResponder.city}, ${newResponder.province}`
      : `${newResponder.street}, CDRRMO HQ, ${newResponder.city}, ${newResponder.province}`;

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email: newResponder.email,
          password: newResponder.password,
          role: "ambulance_responder",
          phone: newResponder.mobileNumber,
          address: fullAddress,
          responderType: newResponder.responderType,
          barangay: isBarangay ? newResponder.barangay : undefined,
        }),
      })

      if (response.ok) {
        toast.success(`Responder account for ${fullName} registered successfully.`)
        fetchRosterData()
        setIsAddModalOpen(false)
        setNewResponder({
          firstName: '', middleName: '', surname: '', suffixName: '', gender: '',
          email: '', mobileNumber: '', province: 'Bulacan', city: 'Baliwag City',
          responderType: 'cdrrmo_hq',
          barangay: '', street: '', password: '', confirmPassword: ''
        })
      } else {
        const err = await response.json()
        setAddError(err.error || "Failed to create responder account.")
      }
    } catch (err) {
      console.error("Failed to add responder:", err)
      setAddError("A network error occurred while registering responder.")
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 p-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-2xl m-6">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="text-lg font-bold">Roster Error</AlertTitle>
        <AlertDescription className="text-base mt-2">
          {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-500 bg-[#F3F4F6] overflow-y-auto">
      <div className="flex justify-end mb-4">
        <Button 
          className="bg-[#2B4C9B] hover:bg-[#2B4C9B]/90 text-white font-medium rounded-md px-4 h-10 shadow-sm"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Responder
        </Button>
      </div>

      <div className="flex-1 w-full max-w-full">
        <RosterTable 
          data={filteredData} 
          searchComponent={<RosterSearch onSearch={setSearchQuery} />}
          filterComponent={<RosterFilter onFilterChange={setFilters} />}
          onManage={handleManage}
          onDelete={handleDelete}
        />
      </div>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-md p-6 border-0 shadow-lg rounded-2xl" showCloseButton={false}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <div className="text-[#1e1b4b]">
                <Trash2 className="w-16 h-16 mb-2 mx-auto stroke-[1.5]" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#1e1b4b] mb-2 tracking-tight">Delete User</DialogTitle>
            <DialogDescription className="text-gray-500 mb-6 text-base font-medium">
              Are you sure you want to delete this user?
            </DialogDescription>
            
            <div className="w-full bg-[#EBF0FC] text-[#1e1b4b] p-4 rounded-xl flex items-center gap-3 mb-8 font-semibold">
              <div className="bg-[#8A9BBF] rounded-full text-white w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">!</div>
              <p>You are about to delete {userToDelete?.fullName}.</p>
            </div>
            
            <div className="flex gap-4 w-full">
              <Button 
                variant="secondary" 
                className="flex-1 bg-[#E5E7EB] hover:bg-gray-300 text-[#4B5563] rounded-xl py-6 font-semibold text-base"
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white rounded-xl py-6 font-semibold text-base"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToBan} onOpenChange={(open) => !open && setUserToBan(null)}>
        <DialogContent className="max-w-md p-6 border-0 shadow-lg rounded-2xl" showCloseButton={false}>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4">
              <div className="text-[#1e1b4b]">
                <UserX className="w-16 h-16 mb-2 mx-auto stroke-[1.5]" />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-[#1e1b4b] mb-2 tracking-tight">Manage User</DialogTitle>
            <DialogDescription className="text-gray-500 mb-6 text-base font-medium">
              Are you sure you want to change this user's status?
            </DialogDescription>
            
            <div className="w-full bg-[#EBF0FC] text-[#1e1b4b] p-4 rounded-xl flex items-center gap-3 mb-6 font-semibold">
              <div className="bg-[#8A9BBF] rounded-full text-white w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">!</div>
              <p>You are about to modify {userToBan?.fullName}.</p>
            </div>
            
            <div className="w-full text-left mb-6">
              <p className="text-[#1e1b4b] font-semibold text-sm mb-2 tracking-tight">Action</p>
              <Select value={banAction} onValueChange={(v: 'SUSPENDED' | 'DEACTIVATED' | null) => { if (v) setBanAction(v); }}>
                <SelectTrigger className="w-full h-12 rounded-xl border-2 border-[#1e1b4b] focus:ring-[#1e1b4b]">
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUSPENDED">Suspend User</SelectItem>
                  <SelectItem value="DEACTIVATED">Deactivate User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full text-left mb-8">
              <p className="text-[#1e1b4b] font-semibold text-sm mb-4 tracking-tight">Why are you taking this action?</p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox id="reason-spam" className="w-5 h-5 rounded" />
                  <label htmlFor="reason-spam" className="text-sm font-semibold text-[#1e1b4b] cursor-pointer">Spamming</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="reason-abuse" className="w-5 h-5 rounded" />
                  <label htmlFor="reason-abuse" className="text-sm font-semibold text-[#1e1b4b] cursor-pointer">Abusive Behavior</label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="reason-other" className="w-5 h-5 rounded" />
                  <label htmlFor="reason-other" className="text-sm font-semibold text-[#1e1b4b] cursor-pointer">Other</label>
                </div>
              </div>
              <div className="mt-4">
                <Textarea className="w-full border-2 border-[#1e1b4b] rounded-xl resize-none min-h-[100px] bg-transparent focus-visible:ring-1 focus-visible:ring-[#1e1b4b]" placeholder="" />
              </div>
            </div>
            
            <div className="flex gap-4 w-full">
              <Button 
                variant="secondary" 
                className="flex-1 bg-[#E5E7EB] hover:bg-gray-300 text-[#4B5563] rounded-xl py-6 font-semibold text-base"
                onClick={() => setUserToBan(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-[#1e1b4b] hover:bg-[#1e1b4b]/90 text-white rounded-xl py-6 font-semibold text-base"
                onClick={confirmBan}
              >
                {banAction === 'SUSPENDED' ? 'Suspend' : 'Deactivate'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md md:max-w-2xl lg:max-w-4xl p-0 border-0 shadow-2xl rounded-[24px] max-h-[90vh] flex flex-col overflow-hidden bg-white" showCloseButton={true}>
          
          <div className="bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] p-6 pb-8 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white mb-1 tracking-tight">Add New Responder</DialogTitle>
                <DialogDescription className="text-blue-100 text-sm font-medium">
                  Register a new responder by filling out their details below.
                </DialogDescription>
              </div>
            </div>
          </div>
            
          <div className="overflow-y-auto px-6 pt-6 pb-2 flex-1 bg-slate-50">
            <form onSubmit={handleAddResponder} className="space-y-6">
              
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-5 h-5 text-[#2B4C9B]" />
                  <h3 className="font-bold text-[#1e1b4b] text-lg">Personal Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">First Name <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      placeholder="e.g. Kyla"
                      value={newResponder.firstName}
                      onChange={(e) => setNewResponder({ ...newResponder, firstName: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Middle Name (Optional)</label>
                    <Input 
                      placeholder="e.g. Tigas"
                      value={newResponder.middleName}
                      onChange={(e) => setNewResponder({ ...newResponder, middleName: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Surname <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      placeholder="e.g. Sanchez"
                      value={newResponder.surname}
                      onChange={(e) => setNewResponder({ ...newResponder, surname: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Suffix Name (Optional)</label>
                    <Input 
                      placeholder="e.g. Jr, III"
                      value={newResponder.suffixName}
                      onChange={(e) => setNewResponder({ ...newResponder, suffixName: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Gender <span className="text-red-500">*</span></label>
                    <Select value={newResponder.gender} onValueChange={(v) => setNewResponder({ ...newResponder, gender: v || '' })}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 focus:ring-[#2B4C9B] focus:bg-white transition-colors px-4">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        <SelectItem value="Male" className="cursor-pointer rounded-lg mx-1 my-0.5">Male</SelectItem>
                        <SelectItem value="Female" className="cursor-pointer rounded-lg mx-1 my-0.5">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-[#2B4C9B]" />
                  <h3 className="font-bold text-[#1e1b4b] text-lg">Contact & Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email Address <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      type="email"
                      placeholder="e.g. example@gmail.com"
                      value={newResponder.email}
                      onChange={(e) => setNewResponder({ ...newResponder, email: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Mobile Number <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      placeholder="e.g. 09123456789"
                      value={newResponder.mobileNumber}
                      onChange={(e) => setNewResponder({ ...newResponder, mobileNumber: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Responder Type <span className="text-red-500">*</span></label>
                    <Select value={newResponder.responderType} onValueChange={(v) => setNewResponder({ ...newResponder, responderType: v || 'cdrrmo_hq', barangay: v === 'cdrrmo_hq' ? '' : newResponder.barangay })}>
                      <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 focus:ring-[#2B4C9B] focus:bg-white transition-colors px-4">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                        <SelectItem value="cdrrmo_hq" className="cursor-pointer rounded-lg mx-1 my-0.5">CDRRMO HQ</SelectItem>
                        <SelectItem value="barangay" className="cursor-pointer rounded-lg mx-1 my-0.5">Barangay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newResponder.responderType === 'barangay' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assigned Barangay <span className="text-red-500">*</span></label>
                      <Select value={newResponder.barangay} onValueChange={(v) => setNewResponder({ ...newResponder, barangay: v || '' })}>
                        <SelectTrigger className="w-full h-12 rounded-xl border-slate-200 bg-slate-50 focus:ring-[#2B4C9B] focus:bg-white transition-colors px-4">
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 shadow-xl max-h-60">
                          {barangays.map(b => (
                            <SelectItem key={b} value={b} className="cursor-pointer rounded-lg mx-1 my-0.5">{b}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Street / House No. <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      placeholder="e.g. 7 Poblacion"
                      value={newResponder.street}
                      onChange={(e) => setNewResponder({ ...newResponder, street: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Province <span className="text-red-500">*</span></label>
                    <Input 
                      disabled
                      value={newResponder.province}
                      className="h-12 rounded-xl border-slate-200 bg-slate-100 text-slate-500 font-medium px-4 opacity-70"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">City / Municipality <span className="text-red-500">*</span></label>
                    <Input 
                      disabled
                      value={newResponder.city}
                      className="h-12 rounded-xl border-slate-200 bg-slate-100 text-slate-500 font-medium px-4 opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-5 h-5 text-[#2B4C9B]" />
                  <h3 className="font-bold text-[#1e1b4b] text-lg">Security Settings</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Password <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      type="password"
                      placeholder="••••••••"
                      value={newResponder.password}
                      onChange={(e) => setNewResponder({ ...newResponder, password: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Confirm Password <span className="text-red-500">*</span></label>
                    <Input 
                      required
                      type="password"
                      placeholder="••••••••"
                      value={newResponder.confirmPassword}
                      onChange={(e) => setNewResponder({ ...newResponder, confirmPassword: e.target.value })}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#2B4C9B] focus-visible:bg-white transition-colors px-4"
                    />
                  </div>
                </div>
              </div>

              {addError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm font-medium">{addError}</p>
                </div>
              )}
              
              <div className="flex gap-4 w-full pt-4 pb-6 sticky bottom-0 bg-slate-50 border-t border-slate-200/50 mt-6 z-10">
                <Button 
                  type="button"
                  variant="outline" 
                  className="flex-1 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl py-6 font-bold text-base shadow-sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#1e1b4b] to-[#2B4C9B] hover:opacity-90 text-white rounded-xl py-6 font-bold text-base shadow-md hover:shadow-lg transition-all"
                >
                  Register Account
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
