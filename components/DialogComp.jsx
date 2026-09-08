"use client";

import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { CiWarning } from "react-icons/ci";

import CarouselComp from "./CarouselComp";

/**
 * IDENTIFICATION FIX: this component previously tracked shortlist status in
 * its own local `shortlistStatus` array, indexed by the applicant's
 * *position* in the currently-selected list, and looked up which applicant
 * to update the same way (`selectedApplicants()[index]`). That's exactly
 * the "index-based identification instead of a stable ID" pattern that's
 * fragile by construction: nothing guaranteed the position CarouselComp
 * rendered a card at stayed aligned with the position used to resolve which
 * applicant's Firestore document actually got patched.
 *
 * Fix: there is no local shortlist state here at all anymore. `dataList`
 * is read straight from `selectedApplicants()` (which reflects the parent
 * DataTable's live `applicants` state) on every render, and every
 * shortlist action is keyed by `applicant._id` -- the same stable id
 * `/api/shortlist/[id]` expects and the same id the main table already
 * used. `onShortlistChange` is the parent's own shortlist handler, so a
 * toggle made from inside this dialog updates the exact same state the
 * main table reads, instead of a second, disconnected copy that used to
 * silently drift out of sync with the table underneath it.
 */
export default function DialogComp({ selectedApplicants, onShortlistChange }) {
    const dataList = selectedApplicants();

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline">View Responses</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw] h-fit">
                <DialogHeader>
                    <DialogTitle>Applicant&apos;s Responses</DialogTitle>
                    <DialogDescription>
                        Questions and answers answered by the applicants can be viewed here.
                    </DialogDescription>
                </DialogHeader>
                <div className="">
                    {dataList.length !== 0 ? (
                        <CarouselComp
                            dataList={dataList}
                            onShortlistChange={onShortlistChange}
                        />
                    ) : (
                        <p className="flex gap-3 items-center justify-start font-light text-md text-red-500">
                            <CiWarning /> No applicant selected
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
