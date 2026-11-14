'use client';

import AdminListSearchCombobox, {
  type AdminListSearchComboboxProps,
  type AdminListSearchItem,
} from '@/components/admin/AdminListSearchCombobox';

/**
 * Public listing typeahead wrapper — same behavior as AdminListSearchCombobox,
 * with organic / `mh-events-search` class names for modernist public pages.
 */
export default function PublicListSearchCombobox<T extends AdminListSearchItem>(
  props: AdminListSearchComboboxProps<T>,
) {
  const {
    className = 'relative w-full mh-typeahead',
    inputClassName = 'mh-typeahead-input',
    ...rest
  } = props;

  return (
    <AdminListSearchCombobox
      {...rest}
      className={className}
      inputClassName={inputClassName}
    />
  );
}
