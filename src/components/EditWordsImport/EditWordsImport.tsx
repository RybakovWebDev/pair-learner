import { useRef, useState } from "react";
import { m, LazyMotion, AnimatePresence } from "framer-motion";

import styles from "./EditWordsImport.module.css";

import { Plus } from "react-feather";
import Spinner from "../Spinner";

import { Pair } from "@/constants";
import { supabase } from "@/utils/supabase/client";
import { handleFileImport } from "@/utils/fileUtils";
import { AnimateChangeInHeight } from "@/utils/helpers";

interface EditWordsImportProps {
  user: any;
  tagsLoading: boolean;
  isAddingNewPair: boolean;
  searchQuery: string;
  isImporting: boolean;
  setIsImporting: (value: boolean) => void;
  setPairs: React.Dispatch<React.SetStateAction<(Pair & { tempId?: string })[]>>;
  scrollToSearch: () => void;
}

function EditWordsImport({
  user,
  tagsLoading,
  isAddingNewPair,
  searchQuery,
  isImporting,
  setIsImporting,
  setPairs,
  scrollToSearch,
}: EditWordsImportProps) {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    setImportSuccess("");
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      return;
    }
    setImportSuccess("");
    setImportError("");
    setIsImporting(true);

    const file = event.target.files?.[0];
    if (!file) {
      setIsImporting(false);
      return;
    }

    const result = await handleFileImport(file, user, supabase);

    if (!result.success) {
      setImportError(result.error || "");
      setImportSuccess("");
    } else {
      if (result.insertedPairs) {
        setPairs((prevPairs) => [
          ...result.insertedPairs.map((pair) => ({
            ...pair,
            tempId: pair.id,
          })),
          ...prevPairs,
        ]);
      }
      setImportSuccess(result.successMessage || "");
      setTimeout(() => {
        scrollToSearch();
      }, 100);
    }

    setIsImporting(false);
    event.target.value = "";
  };

  const loadFeatures = () => import("../../featuresMax").then((res) => res.default);

  return (
    <LazyMotion features={loadFeatures}>
      <div className={styles.importWrapper}>
        <p>
          You can also import a list of word pairs from a file. It has to be an Excel or CSV table formatted with two
          columns, where each row is a pair of words.
        </p>

        <input
          ref={fileInputRef}
          type='file'
          accept='.csv,.xlsx,.xls'
          onChange={handleFileSelect}
          style={{ display: "none" }}
          aria-label='Import word pairs from CSV or Excel file'
        />

        <m.button
          className={styles.importButton}
          initial={{ backgroundColor: "var(--color-background)" }}
          animate={{
            opacity: isAddingNewPair || Boolean(searchQuery) || isImporting ? 0.5 : 1,
          }}
          style={{
            pointerEvents: isAddingNewPair || Boolean(searchQuery) || isImporting ? "none" : "auto",
          }}
          whileTap={
            user && !isAddingNewPair && !isImporting ? { backgroundColor: "var(--color-background-highlight)" } : {}
          }
          onClick={handleImport}
          disabled={!user || tagsLoading || isAddingNewPair || Boolean(searchQuery) || isImporting}
        >
          <p>{isImporting ? "Importing..." : "Import word pairs"}</p>
          {isImporting ? <Spinner height='20px' width='20px' borderWidth='2px' /> : <Plus size={25} />}
        </m.button>

        <AnimateChangeInHeight className={styles.importMessageWrapper}>
          <AnimatePresence>
            {importError && (
              <m.p
                className={styles.errorMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {importError}
              </m.p>
            )}
            {importSuccess && (
              <m.p
                className={styles.successMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {importSuccess}
              </m.p>
            )}
          </AnimatePresence>
        </AnimateChangeInHeight>
      </div>
    </LazyMotion>
  );
}

export default EditWordsImport;
