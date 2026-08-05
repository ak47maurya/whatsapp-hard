function createNew() {
    $('#newUserModal').modal('show');
}
document.getElementById("clos").addEventListener('click', () => $('#newUserModal').modal('hide'))
document.getElementById("closee").addEventListener('click', () => $('#newUserModal').modal('hide'))

document.getElementById('createUserBtn').addEventListener('click', function () {
    // Fetch form values
    const createUser = {
        username: document.getElementById('newUsername').value,
        email: document.getElementById('newEmail').value,
        password: document.getElementById('newPassword').value,
        role: document.getElementById('newRole').value,
        manyInstance: document.getElementById('newManyInstance').value,
        startDate: document.getElementById('newStartDate').value,
        endDate: document.getElementById('newEndDate').value,
        planStatus: document.getElementById('newPlanStatus').value,
        planType: document.getElementById('newPlanType').value
    }
    console.log(createUser)

    fetch(`/manager/addNewUsers/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createUser)
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to update');
            return response.json();
        })
        .then(() => {
            fetchData(); // Refresh table
        })
        .catch(error => console.error('Error updating data:', error));
    // Optional: Clear form and close modal
    document.getElementById('newUserForm').reset();
    $('#newUserModal').modal('hide');
});



let data = []; // Global data array
let editIndex = null;

// Function to fetch data from API
function fetchData() {
    fetch('/manager/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(fetchedData => {
            data = fetchedData; // Store data globally
            populateTable(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

function formatDate(dateString) {
    if (!dateString) return '-'; 
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date); 
}
function formatToDateInput(dateString) {
    if (!dateString) return ''; 
    const date = new Date(dateString); 
    return date.toISOString().split('T')[0];
}
// Function to populate the table
function populateTable(data) {
    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = '';
    data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
                <th scope="row">${index + 1}</th>
                <td>${row.username || '-'}</td>
                <td>${row.email || '-'}</td>
                <td>${row.role || '-'}</td>
                <td>${row.manyInstance || '-'}</td>
                <td>${formatDate(row.startDate) || '-'}</td>
                <td>${formatDate(row.endDate) || '-'}</td>
                <td>${row.planStatus || '-'}</td>
                <td>${row.planType || '-'}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="openEdit(${index})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRow(${index})">Delete</button>
                </td>
            `;
        tableBody.appendChild(tr);
    });
}

// Open the edit modal and populate fields
function openEdit(index) {
    editIndex = index; // Set the index of the row being edited
    const row = data[index];

    // Populate the form fields
    document.getElementById('username').value = row.username || '';
    document.getElementById('email').value = row.email || '';
    document.getElementById('role').value = row.role || '';
    document.getElementById('manyInstance').value = row.manyInstance || '';
    document.getElementById('startDate').value = formatToDateInput(row.startDate) ;
    document.getElementById('endDate').value = formatToDateInput(row.endDate);
    document.getElementById('planStatus').value = row.planStatus || '';
    document.getElementById('planType').value = row.planType || '';

    // Open the modal
    $('#editDiv').modal('show');
}
document.getElementById('close').addEventListener('click', function () {
    $('#editDiv').modal('hide');
})

document.getElementById('clo').addEventListener('click', function () {
    $('#editDiv').modal('hide');
})
// Submit updated data
document.getElementById('submitBtn').addEventListener('click', function () {
    if (editIndex !== null) {
        const updatedData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            role: document.getElementById('role').value,
            manyInstance: document.getElementById('manyInstance').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            planStatus: document.getElementById('planStatus').value,
            planType: document.getElementById('planType').value,
        };

        const rowId = data[editIndex]._id;
        console.log(rowId)
        fetch(`/manager/users/${rowId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Failed to update');
                return response.json();
            })
            .then(() => {
                $('#editDiv').modal('hide');
                fetchData(); // Refresh table
            })
            .catch(error => console.error('Error updating data:', error));
    }
}
);

// Delete a row
function deleteRow(index) {
    editIndex = index; // Set the index of the row being edited
    const row = data[index];
   const rowId = row._id;
    if (confirm("Are you sure you want to delete this row?")) {
        fetch(`/manager/users/${rowId}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete');
                }
                return response.json();
            })
            .then(() => {
                console.log(`Row with ID ${rowId} deleted successfully`);
                fetchData(); // Refresh the table
            })
            .catch(error => console.error('Error deleting row:', error));
    }
}


// Fetch data when the page loads
fetchData();