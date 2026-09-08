"use client";
import React from "react";
import { authClient } from "@/lib/auth-client";
import DataTable from "./DataTable";

const AdminContent = ({ applicants }) => {
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;
  const isAuthenticated = !isPending && !!user;
  const isAdmin = user?.role === "admin";

  if (isPending) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-white">
        <h2 className="text-xl font-semibold">Authentication Required</h2>
        <p className="text-slate-400">Please sign in to access the admin panel.</p>
        <button
          type="button"
          onClick={() => { window.location.href = "/auth/signin"; }}
          className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-all"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-400 font-semibold">
        Access Denied — you are not authorized to view this page.
      </div>
    );
  }

  return (
    <div>
      <DataTable data={applicants} />
    </div>
  );
};

export default AdminContent;
