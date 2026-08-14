"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  FileText,
  Users,
  DollarSign,
  ClipboardCheck,
  Download,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  type Role,
  type AuditAction,
  type AuditResource,
  type AuditEntry,
  type BudgetStatus,
  type BudgetAlertLevel,
  type LgpdRequest,
  getAllRoles,
  getRoleLabel,
  getPermissionLabel,
  getPermissionsForRole,
  setUserRole,
  removeUserRole,
  listAllUsers,
  getAuditTrail,
  exportAuditTrail,
  clearAuditTrail,
  purgeExpiredEntries,
  subscribeAuditTrail,
  getActionLabel,
  getResourceLabel,
  checkBudget,
  loadCostGovernorConfig,
  saveCostGovernorConfig,
  resetTaskCost,
  resetSessionCost,
  getCostHistory,
  formatBudgetAmount,
  getAlertDescription,
  detectPII,
  getPiiTypeLabel,
  getLgpdRequests,
  resolveLgpdRequest,
  getLgpdStatusLabel,
} from "@/lib/governance";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const USER_IDS = ["user-1", "user-2", "user-3", "user-4", "user-5"];
const USER_NAMES: Record<string, string> = {
  "user-1": "Carlos Silva",
  "user-2": "Ana Oliveira",
  "user-3": "Roberto Lima",
  "user-4": "Marina Santos",
  "user-5": "Pedro Costa",
};

function seedMockData() {
  if (typeof window === "undefined") return;
  const hasRoles = localStorage.getItem("promptarchitect.rbac.roles");
  if (!hasRoles) {
    setUserRole("user-1", "SUPER_ADMIN", "system");
    setUserRole("user-2", "ADMIN", "system");
    setUserRole("user-3", "MANAGER", "system");
    setUserRole("user-4", "MEMBER", "system");
    setUserRole("user-5", "VIEWER", "system");
  }
}
