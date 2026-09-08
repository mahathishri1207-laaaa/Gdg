"use client";
import React, { useState } from "react";

import NavBar from "@/components/NavBar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import PopupComp from "@/components/PopupComp";
import { authClient } from "@/lib/auth-client";

const Home = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  // Use Better Auth's useSession hook directly
  const { data: session, isPending } = authClient.useSession();

  const user = session?.user;

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const popupConfig = {
    header: "Recruitment Notice",
    description: "Welcome to the GDG Recruitment Portal!",
    message: [
      "Sign in with your email address to begin your application.",
      "You can apply to up to two departments.",
    ],
  };

  return (
    <main className="flex flex-col flex-grow">
      <NavBar />
      {!isPending && !user && (
        <PopupComp
          isOpen={isDialogOpen}
          onClose={handleDialogClose}
          PopupData={popupConfig}
        />
      )}
      <Hero />
      <Footer />
    </main>
  );
};

export default Home;
