import { motion } from "framer-motion";

export const PageMotionWrapper = ({ children, testId }) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.35, ease: "easeOut" }}
    className="space-y-6"
    data-testid={testId}
  >
    {children}
  </motion.section>
);
