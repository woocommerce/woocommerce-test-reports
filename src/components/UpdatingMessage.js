import React from 'react';

export default function UpdatingMessage( { isUpdating = false, updatingText = 'Updating...' } ) {
	if ( ! isUpdating ) {
		return null;
	}

	return <div className="updating-message">{ updatingText }</div>;
}
