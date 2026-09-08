"use client";
import { React, useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterDepartment from "./FilterDepartment";
import FilterShortlisted from "./FilterShortlisted";
import { FaSortAmountDownAlt } from "react-icons/fa";
import { GrPowerReset } from "react-icons/gr";
import { Button } from "./ui/button";
import { CheckBoxComp } from "./CheckBoxComp";
import { toast } from "sonner";
import { IoCloudDownloadOutline } from "react-icons/io5";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  useFilters,
  usePagination,
  useRowSelect,
} from "react-table";
import { Input } from "@/components/ui/input";
import PaginationComp from "./PaginationComp";
import DialogComp from "./DialogComp";
import MailComposer from "./MailComposer";
import { CSVLink } from "react-csv";
import { CSV_Header } from "@/constants";

const DataTable = ({ data }) => {
  // SOURCE OF TRUTH: the applicant list as fetched from the server. Local
  // mutations (shortlist toggles) update this in place via `_id`, so every
  // view derived from it (filtered table, CSV export, selection) always
  // reflects the latest known state.
  //
  // STATE-MANAGEMENT FIX: the previous version kept four separate pieces
  // of state for what is really one dataset plus two filters --
  // `data` (prop), `deptFiltered`, `shortFiltered`, and `tableData` -- kept
  // in sync via a chain of `useEffect`s that recomputed `tableData` by
  // manually intersecting `deptFiltered`/`shortFiltered` against each other
  // and against the original `data`. That's a lot of moving, independently
  // stale-able state to represent "one dataset, filtered by up to two
  // criteria." It's replaced below with two small filter *values*
  // (not filtered copies of the whole array) and a single `useMemo` that
  // derives the visible rows from `applicants` + those two values --
  // the standard "source data -> filters -> derived data" shape.
  const [applicants, setApplicants] = useState(data);
  const [deptFilter, setDeptFilter] = useState(null);
  const [shortFilter, setShortFilter] = useState(null);

  const filterFunc = useCallback((dept) => {
    setDeptFilter(dept || null);
  }, []);

  const shortlistedFilterFunc = useCallback((status) => {
    setShortFilter(status || null);
  }, []);

  const resetFilters = useCallback(() => {
    // PERFORMANCE FIX: this button previously called `window.location.reload()`,
    // discarding all client state and re-fetching the entire applicant list
    // from the server just to clear two filter values. A full reload is
    // never necessary to reset in-memory filter state.
    setDeptFilter(null);
    setShortFilter(null);
    setGlobalFilter(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tableData = useMemo(() => {
    return applicants.filter((applicant) => {
      if (deptFilter && applicant.Department !== deptFilter) return false;
      if (shortFilter && String(applicant.shortlisted) !== shortFilter) return false;
      return true;
    });
  }, [applicants, deptFilter, shortFilter]);

  const applicantTotalCount = tableData.length;
  const shortlistedApplicantCount = useMemo(
    () => tableData.filter((item) => item.shortlisted).length,
    [tableData]
  );

  const handleShortlist = useCallback(async (id, isShortlisted) => {
    try {
      const res = await fetch(`/api/shortlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlisted: !isShortlisted }),
      });

      if (res.ok) {
        // Update in place by stable Firestore document ID, not by array
        // position -- this must survive sorting, filtering, and pagination.
        setApplicants((current) =>
          current.map((applicant) =>
            applicant._id === id
              ? { ...applicant, shortlisted: !isShortlisted }
              : applicant
          )
        );
        toast.success("Student status updated!");
      } else {
        throw new Error("Failed to update");
      }
    } catch (error) {
      console.error("Error occurred while updating the status:", error.message);
      toast.error("Failed to update status");
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        Header: "Sr No",
        accessor: (row, index) => index + 1,
      },
      {
        Header: "Name",
        accessor: "Name",
      },
      {
        Header: "RegistrationNumber",
        accessor: "RegistrationNumber",
      },
      {
        Header: "Email",
        accessor: "Email",
      },
      {
        Header: "Phone",
        accessor: "Phone",
      },
      {
        Header: "Department",
        accessor: "Department",
      },
      {
        Header: "Preference",
        accessor: "Pref",
      },
      {
        Header: "Shortlisted",
        accessor: "shortlisted",
        Cell: ({ row }) => (
          <button
            onClick={() =>
              handleShortlist(row.original._id, row.original.shortlisted)
            }
            className={`px-4 py-2 rounded w-[115px] ${
              row.original.shortlisted
                ? "bg-red-600 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {row.original.shortlisted ? "Unshortlist" : "Shortlist"}
          </button>
        ),
      },
    ],
    [handleShortlist]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    state,
    pageOptions,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    selectedFlatRows,
  } = useTable(
    {
      columns,
      data: tableData,
      // IDENTIFICATION FIX: without `getRowId`, react-table assigns each
      // row an id equal to its numeric position in `data`. Row selection
      // (used for "View Responses" and bulk email) is keyed by that id
      // internally. Keying by stable `_id` instead means a row's selection
      // state, once set, always refers to the same applicant regardless of
      // how the table is sorted, filtered, or paginated afterward.
      getRowId: (row) => row._id,
      // Because rows are now identified by stable ID rather than position,
      // it's safe to let a local, in-place update (a single shortlist
      // toggle) leave the current selection alone -- the ids involved
      // haven't changed, so there's nothing stale to reset. Previously
      // (with positional ids and the default `autoResetSelectedRows: true`)
      // *every* shortlist click replaced the `tableData` array reference
      // and silently cleared the admin's entire current checkbox
      // selection -- easy to lose a bulk-email selection by shortlisting
      // one applicant first.
      autoResetSelectedRows: false,
    },
    useFilters,
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => {
        return [
          {
            Header: ({ getToggleAllRowsSelectedProps }) => (
              <CheckBoxComp {...getToggleAllRowsSelectedProps()} />
            ),
            Cell: ({ row }) => (
              <CheckBoxComp {...row.getToggleRowSelectedProps()} />
            ),
          },
          ...columns,
        ];
      });
    }
  );

  const { globalFilter, pageIndex } = state;

  const handlePageSize = (e) => {
    const sz = Number(e.target.value);
    setPageSize(sz || 10);
  };

  const selectedApplicants = useCallback(
    () => selectedFlatRows.map((row) => row.original),
    [selectedFlatRows]
  );

  const handleRowSelection = async (payloadData) => {
    const request = {
      recipients: selectedApplicants(),
      payloadData,
    };

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        toast.success("Invite has been sent!");
      } else {
        toast.error("Failed to send invite. Please try again later.");
      }
    } catch (error) {
      console.error("Error sending emails:", error);
      toast.error("Failed to send invite. Please try again later.");
    }
  };

  const formatQuestionsForCsv = (item) => {
    if (!item?.Questions) return "";

    if (Array.isArray(item.Questions)) {
      return item.Questions
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (Array.isArray(entry)) return entry.join(": ");
          if (entry && typeof entry === "object") {
            return Object.entries(entry)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ");
          }
          return String(entry ?? "");
        })
        .join(" | ");
    }

    if (typeof item.Questions === "object") {
      return Object.entries(item.Questions)
        .map(([question, answer]) => `${question}: ${answer}`)
        .join(" | ");
    }

    return String(item.Questions);
  };

  const csv_link = {
    headers: CSV_Header,
    data: tableData.map((item) => ({
      ...item,
      Questions: formatQuestionsForCsv(item),
    })),
    filename: "applicants.csv",
  };

  return (
    <div className="bg-[#121212] flex flex-col gap-3 p-3 mt-5 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm text-neutral-400">
          Showing <span className="text-white font-medium">{applicantTotalCount}</span>{" "}
          applicant{applicantTotalCount === 1 ? "" : "s"}
          {(deptFilter || shortFilter) && " (filtered)"} &middot;{" "}
          <span className="text-white font-medium">{shortlistedApplicantCount}</span>{" "}
          shortlisted
        </p>
      </div>
      <div className="flex items-start border-none justify-start gap-3 p-1 overflow-x-scroll">
        <Input
          value={globalFilter || ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Filter Data"
          className="min-w-[300px]"
        />
        <Input
          className="w-fit"
          onChange={(e) => handlePageSize(e)}
          placeholder={"Page Size"}
        />
        <FilterDepartment filterFunc={filterFunc} />
        <FilterShortlisted filterFunc={shortlistedFilterFunc} />
        <DialogComp selectedApplicants={selectedApplicants} onShortlistChange={handleShortlist} />
        {/*
          FUNCTIONAL FIX: MailComposer (a full rich-text bulk-email composer)
          and the `handleRowSelection` submit handler for it already existed
          in this file, but the component was never rendered anywhere --
          admins had no way to reach the custom-email feature at all despite
          it being fully implemented end-to-end (including the now-secured
          POST /api/send-email).
        */}
        <MailComposer
          recipients={selectedFlatRows.length}
          handleRowSelection={handleRowSelection}
        />
        <Button onClick={resetFilters} className="flex gap-2">
          <GrPowerReset />
          Reset Filters
        </Button>
        <Button>
          <CSVLink
            {...csv_link}
            className="flex gap-2 justify-center items-center"
          >
            <IoCloudDownloadOutline />
            Download CSV
          </CSVLink>
        </Button>
      </div>

      {applicantTotalCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-neutral-400">
          <p className="text-lg font-medium">No applicants match these filters</p>
          <p className="text-sm">Try clearing a filter or search term.</p>
          <Button onClick={resetFilters} variant="outline" className="mt-2">
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table {...getTableProps()}>
            <TableHeader>
              {headerGroups.map((hg) => (
                <TableRow key={hg.id} {...hg.getHeaderGroupProps()}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      {...header.getHeaderProps(header.getSortByToggleProps())}
                    >
                      <div className="inline-flex gap-1 items-center">
                        {header.render("Header")}
                        <FaSortAmountDownAlt />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody {...getTableBodyProps()}>
              {page.map((row) => {
                prepareRow(row);
                return (
                  <TableRow key={row.id} {...row.getRowProps()}>
                    {row.cells.map((cell) => (
                      <TableCell key={cell.column.id} {...cell.getCellProps()}>
                        {cell.render("Cell")}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationComp
        pageIndex={pageIndex}
        pages={pageOptions.length}
        nextPage={nextPage}
        canNext={canNextPage}
        previousPage={previousPage}
        canPrev={canPreviousPage}
        goto={gotoPage}
        pageCount={pageCount}
      />
    </div>
  );
};

export default DataTable;
