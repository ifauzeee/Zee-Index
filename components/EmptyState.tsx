"use client";

import React from "react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  message,
}) => {
  return (
    <motion.div
      className="flex flex-col items-center justify-center text-center p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <Icon className="h-24 w-24 text-primary/20" strokeWidth={1.5} />
      <h3 className="mt-6 text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </motion.div>
  );
};

export default EmptyState;
