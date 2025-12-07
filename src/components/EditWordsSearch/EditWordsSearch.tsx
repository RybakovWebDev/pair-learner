"use client";
import { useCallback, useEffect, useRef } from "react";

import styles from "./EditWordsSearch.module.css";

import { Search } from "react-feather";

import { Pair } from "@/constants";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";

interface EditWordsSearchProps {
  user: User | null;
  tagsLoading: boolean;
  isImporting: boolean;
  isSearching: boolean;
  setIsSearching: (isSearching: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setPairs: React.Dispatch<React.SetStateAction<(Pair & { tempId?: string })[]>>;
  loadedPairs: (Pair & { tempId?: string })[];
  setHasMore: (hasMore: boolean) => void;
  offset: number;
  searchInputRef: React.RefObject<HTMLDivElement | null>;
}

const EditWordsSearch = ({
  user,
  tagsLoading,
  isImporting,
  setIsSearching,
  searchQuery,
  setSearchQuery,
  setPairs,
  loadedPairs,
  setHasMore,
  offset,
  searchInputRef,
}: EditWordsSearchProps) => {
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  const handleSearch = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchQuery(query);

      if (!user) return;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        setPairs([]);

        await new Promise((resolve) => setTimeout(resolve, 300));

        if (query) {
          try {
            const { data: matchingTags, error: tagError } = await supabase
              .from("tags")
              .select("id")
              .ilike("name", `%${query}%`)
              .eq("user_id", user.id);

            if (tagError) {
              console.error("Error searching tags:", tagError);
              return;
            }

            const matchingTagIds = matchingTags.map((tag) => tag.id);

            let { data, error } = await supabase
              .from("word-pairs")
              .select("*")
              .eq("user_id", user.id)
              .or(
                `word1.ilike.%${query}%,word2.ilike.%${query}%${
                  matchingTagIds.length > 0 ? `,tag_ids.cs.{${matchingTagIds.join(",")}}` : ""
                }`
              )
              .order("created_at", { ascending: false });

            if (error) {
              console.error("Error searching pairs:", error);
              return;
            }

            const updatedData = data
              ? data.map((pair: Pair) => ({
                  ...pair,
                  tempId: pair.id,
                }))
              : [];

            setPairs(updatedData);
            setHasMore(false);
          } catch (error) {
            console.error("Search error:", error);
          }
        } else {
          setPairs(loadedPairs);
          setHasMore(loadedPairs.length === offset);
        }

        setIsSearching(false);
      }, 500);
    },
    [user, loadedPairs, offset, setPairs, setHasMore, setIsSearching, setSearchQuery]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.searchWrapper} ref={searchInputRef}>
      <label htmlFor='search-input' className={styles.visuallyHidden}>
        Search by word or tag
      </label>
      <Search />
      <input
        id='search-input'
        className={styles.search}
        type='search'
        placeholder='Search pairs by word or tag'
        maxLength={25}
        onChange={handleSearch}
        disabled={!user || tagsLoading || isImporting}
        value={searchQuery}
      />
    </div>
  );
};

export default EditWordsSearch;
