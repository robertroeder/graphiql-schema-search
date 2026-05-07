import { css } from '@emotion/react';

export const schemaSearch = css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    fontFamily: 'var(--font-family, system-ui, -apple-system, sans-serif)',
    fontSize: 'var(--font-size-body, 13px)',
    color: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
});

export const header = css({
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-neutral-15, hsla(var(--color-neutral), 0.15))',
});

export const input = css({
    width: '100%',
    padding: '6px 8px',
    border: '1px solid var(--color-neutral-30, hsla(var(--color-neutral), 0.3))',
    borderRadius: '4px',
    background: 'var(--color-base, transparent)',
    color: 'inherit',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    '&:focus': {
        borderColor: 'var(--color-primary, hsl(var(--color-primary)))',
    },
    '&::placeholder': {
        color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    },
});

export const filters = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    padding: '6px 12px',
    borderBottom: '1px solid var(--color-neutral-15, hsla(var(--color-neutral), 0.15))',
});

export const filterChip = css({
    padding: '2px 8px',
    border: '1px solid var(--color-neutral-30, hsla(var(--color-neutral), 0.3))',
    borderRadius: '12px',
    background: 'hsl(var(--color-base))',
    color: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
    fontSize: '11px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    '&:hover': {
        background: 'var(--color-neutral-10, hsla(var(--color-neutral), 0.1))',
    },
});

export const filterChipActive = css({
    background: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
    color: 'hsl(var(--color-base))',
    borderColor: 'hsl(var(--color-base))',
    fontWeight: 600,
    '&:hover': {
        background: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
    },
});

export const results = css({
    flex: '1 1 0',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
});

export const sectionHeader = css({
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    background: 'var(--color-neutral-05, hsla(var(--color-neutral), 0.05))',
    flexShrink: 0,
});

export const argsHeader = css({
    padding: '10px 0 4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
});

export const item = css({
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    height: '100%',
    boxSizing: 'border-box',
    '&:hover': {
        background: 'var(--color-neutral-10, hsla(var(--color-neutral), 0.1))',
    },
});

export const itemName = css({
    fontWeight: 500,
    color: 'var(--color-neutral-80, hsla(var(--color-neutral), 0.8))',
});

export const itemTypePrefix = css({
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    marginRight: '2px',
});

export const itemKind = css({
    marginLeft: 'auto',
    paddingLeft: '8px',
    fontSize: '11px',
    color: 'var(--color-neutral-30, hsla(var(--color-neutral), 0.3))',
    flexShrink: 0,
});

export const detail = css({
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
});

export const detailHeader = css({
    padding: '8px 12px',
    borderBottom: '1px solid var(--color-neutral-15, hsla(var(--color-neutral), 0.15))',
});

export const backBtn = css({
    background: 'none',
    border: 'none',
    color: 'var(--color-primary, hsl(var(--color-primary)))',
    cursor: 'pointer',
    padding: 0,
    fontSize: 'inherit',
    fontFamily: 'inherit',
    marginBottom: '10px',
    display: 'block',
    '&:hover': {
        textDecoration: 'underline',
    },
});

export const typeName = css({
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-neutral-80, hsla(var(--color-neutral), 0.8))',
});

export const typeKindBadge = css({
    fontSize: '11px',
    fontWeight: 400,
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    marginLeft: '8px',
    userSelect: 'none',
});

export const typeImplements = css({
    fontSize: '12px',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    marginTop: '4px',
});

export const typeDescription = css({
    padding: '8px 12px 12px',
    fontSize: '12px',
    color: 'var(--color-neutral-50, hsla(var(--color-neutral), 0.5))',
    borderBottom: '1px solid var(--color-neutral-15, hsla(var(--color-neutral), 0.15))',
});

export const fieldItem = css({
    padding: '6px 12px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
    cursor: 'pointer',
    overflow: 'hidden',
    '&:hover': {
        background: 'var(--color-neutral-10, hsla(var(--color-neutral), 0.1))',
    },
});

export const fieldItemExpanded = css({
    background: 'var(--color-neutral-05, hsla(var(--color-neutral), 0.05))',
    overflowY: 'auto',
    boxShadow: 'inset 3px 0 0 0 var(--color-neutral-05, hsla(var(--color-neutral), 0.3))',
});

export const fieldItemRow = css({
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export const fieldItemDesc = css({
    fontSize: '11px',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
});

export const fieldName = css({
    fontWeight: 500,
    color: 'var(--color-neutral-80, hsla(var(--color-neutral), 0.8))',
});

export const fieldArgs = css({
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    fontSize: '12px',
});

export const fieldReturn = css({
    color: 'var(--color-primary, hsl(var(--color-primary)))',
    cursor: 'pointer',
    fontSize: '12px',
    '&:hover': {
        textDecoration: 'underline',
    },
});

export const fieldDefault = css({
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    fontSize: '12px',
});

export const noResults = css({
    padding: '24px 12px',
    textAlign: 'center',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
});

export const count = css({
    padding: '4px 12px',
    fontSize: '11px',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    flexShrink: 0,
});

export const tabs = css({
    display: 'flex',
    borderBottom: '1px solid var(--color-neutral-15, hsla(var(--color-neutral), 0.15))',
    flexShrink: 0,
    marginBottom: '8px',
});

export const tab = css({
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
    fontFamily: 'inherit',
    '&:hover': {
        color: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
    },
});

export const tabActive = css({
    color: 'var(--color-neutral-80, hsla(var(--color-neutral), 0.8))',
    borderBottomColor: 'var(--color-primary, hsl(var(--color-primary)))',
});

export const enumValue = css({
    padding: '4px 12px',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    color: 'var(--color-neutral-60, hsla(var(--color-neutral), 0.6))',
    overflow: 'hidden',
});

export const possibleType = css({
    padding: '4px 12px',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--color-primary, hsl(var(--color-primary)))',
    '&:hover': {
        textDecoration: 'underline',
        background: 'var(--color-neutral-10, hsla(var(--color-neutral), 0.1))',
    },
});

export const fieldDetailArgs = css({
    paddingBottom: '8px',
});

export const fieldDetailArg = css({
    padding: '6px 12px 2px',
});

export const fieldDetailArgDesc = css({
    padding: '2px 0 4px',
    fontSize: '11px',
    color: 'var(--color-neutral-40, hsla(var(--color-neutral), 0.4))',
});
