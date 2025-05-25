document.addEventListener('DOMContentLoaded', async () => {
    const expenseForm = document.getElementById('expenseForm');
    const expenseList = document.getElementById('expenseList');
    const buyPremiumButton = document.getElementById('buyPremium');
    const showLeaderboardButton = document.getElementById('showLeaderboard');
    const leaderboard = document.getElementById('leaderboard');
    const leaderboardList = document.getElementById('leaderboardList');
    const viewInsightsButton = document.getElementById('viewInsights');
    const expensesPerPageSelect = document.getElementById('expensesPerPage');
    const paginationContainer = document.getElementById('paginationContainer');
    const token = localStorage.getItem('token');

    const cashfree = Cashfree({ mode: "sandbox" });

    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const fetchUserDetails = async () => {
        try {
            const response = await fetch('/api/user-details', {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching user details:', error);
            alert('Failed to fetch user details: ' + error.message);
            return null;
        }
    };

    const userDetails = await fetchUserDetails();

    const updatePremiumUI = (isPremium) => {
        if (isPremium) {
            buyPremiumButton.textContent = 'Using Premium';
            const oldClickListener = buyPremiumButton.__clickHandler; 
            if (oldClickListener) {
                buyPremiumButton.removeEventListener('click', oldClickListener);
            }
            const newClickListener = () => {
                alert('You are using the premium');
            };
            buyPremiumButton.addEventListener('click', newClickListener);
            buyPremiumButton.__clickHandler = newClickListener; 
            showLeaderboardButton.style.display = 'block';
        } else {
            buyPremiumButton.textContent = 'Buy Premium';
            const oldClickListener = buyPremiumButton.__clickHandler;
            if (oldClickListener) {
                buyPremiumButton.removeEventListener('click', oldClickListener);
            }
            const newClickListener = async () => {
                try {
                    const response = await axios.post(`http://localhost:5500/api/create-order`, {
                        orderId: Math.random().toString(36).substring(2, 15), 
                        orderAmount: 499, 
                        orderCurrency: 'INR',
                    }, {
                        headers: {
                            'Authorization': token 
                        }
                    });

                    console.log("Payment initiation response:", response.data);
                    const paymentSessionId = response.data.paymentSession_id;

                    if (!paymentSessionId) {
                        alert('Failed to get payment session ID from backend.');
                        return;
                    }

                    let checkoutOptions = {
                        paymentSessionId: paymentSessionId,
                        redirectTarget: '_self', 
                    };

                    await cashfree.checkout(checkoutOptions);

                } catch (error) {
                    console.error("Error initiating payment:", error);
                    alert(error.response?.data?.message || error.message || 'Error initiating payment.');
                }
            };
            buyPremiumButton.addEventListener('click', newClickListener);
            buyPremiumButton.__clickHandler = newClickListener; 

            showLeaderboardButton.style.display = 'none';
        }
    };

    if (userDetails) {
        updatePremiumUI(userDetails.isPremiumUser);
    } else {
        updatePremiumUI(false); 
    }


    (async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            const orderId = params.get('orderId');

            if (orderId) {
                console.log(`Checking payment status for orderId: ${orderId}`);
                const response = await axios.get(`http://localhost:5500/api/payment-status/${orderId}`);
                console.log("Response from payment status check:", response);

                alert(`Payment status: ${response.data.status}`);

                if (response.data.status === 'success') {
                    alert('Payment successful! You are now a premium user.');
                    const updatedUserDetails = await fetchUserDetails();
                    if (updatedUserDetails) {
                        updatePremiumUI(updatedUserDetails.isPremiumUser);
                    }
                } else {
                    alert('Payment failed or is pending. Please try again.');
                }

                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error("Error checking payment status:", error);
            alert(error.response?.data?.message || error.message || 'Error checking payment status.');
        }
    })();


    let expensesPerPage = localStorage.getItem('expensesPerPage') || 10;
    expensesPerPageSelect.value = expensesPerPage;

    let currentPage = 1;

    const fetchExpenses = async (page = 1) => {
        try {
            const response = await fetch(`/api/expenses/monthly?page=${page}&limit=${expensesPerPage}`, {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const { expenses, totalExpenses, totalPages, currentPage: fetchedCurrentPage } = await response.json();
            expenseList.innerHTML = ''; // Clear previous list
            if (Array.isArray(expenses) && expenses.length > 0) {
                expenses.forEach(expense => {
                    const li = document.createElement('li');
                    li.textContent = `${parseFloat(expense.amount).toFixed(2)} - ${expense.description} - ${expense.category}`;
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.addEventListener('click', async () => {
                        console.log(`Deleting expense with id: ${expense.id}`);
                        await deleteExpense(expense.id);
                        await fetchExpenses(fetchedCurrentPage); // Fetch current page again after deletion
                    });
                    li.appendChild(deleteButton);
                    expenseList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No expenses found for this month.';
                expenseList.appendChild(li);
            }
            updatePagination(totalPages, fetchedCurrentPage);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            alert('Failed to fetch expenses: ' + error.message);
        }
    };

    const updatePagination = (totalPages, currentPage) => {
        if (!paginationContainer) {
            console.warn('Pagination container not found. Please add an element with id="paginationContainer" to dashboard.html');
            return;
        }
        paginationContainer.innerHTML = ''; 

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.disabled = i === currentPage; 
            pageButton.addEventListener('click', () => {
                fetchExpenses(i); 
            });
            paginationContainer.appendChild(pageButton);
        }
    };

    fetchExpenses(currentPage);

    const deleteExpense = async (id) => {
        try {
            console.log(`Sending DELETE request for id: ${id}`);
            const response = await fetch(`/api/expenses/monthly/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            } else {
                console.log(`Expense with id: ${id} deleted successfully`);
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            alert('Failed to delete expense: ' + error.message);
        }
    };

    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const amount = document.getElementById('amount').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount, description, category })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            await fetchExpenses(currentPage); 
            expenseForm.reset();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert('Failed to add expense: ' + error.message);
        }
    });


    // --- Leaderboard Logic ---
    showLeaderboardButton.addEventListener('click', async () => {
        await updateLeaderboard();
        leaderboard.style.display = 'block'; 
    });

    const updateLeaderboard = async () => {
        try {
            const response = await fetch('/api/leaderboard', {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const leaderboardData = await response.json();
            leaderboardList.innerHTML = ''; // Clear previous leaderboard entries
            if (Array.isArray(leaderboardData) && leaderboardData.length > 0) {
                leaderboardData.forEach(user => {
                    const li = document.createElement('li');
                    li.textContent = `${user.name} - Total Expenses: ${parseFloat(user.total_expenses || 0).toFixed(2)}`;
                    leaderboardList.appendChild(li);
                });
            } else {
                const li = document.createElement('li');
                li.textContent = 'No leaderboard data available.';
                leaderboardList.appendChild(li);
            }
        } catch (error) {
            console.error('Error updating leaderboard:', error);
            alert('Failed to update leaderboard: ' + error.message);
        }
    };

    viewInsightsButton.addEventListener('click', async () => {
        try {
           
            const response = await fetch('/api/expenses/all-monthly', {
                method: 'GET',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const { expenses } = await response.json(); 
            localStorage.setItem('monthlyExpenses', JSON.stringify(expenses));
            window.location.href = '/insights.html'; 
        } catch (error) {
            console.error('Error preparing insights data:', error);
            alert('Failed to load insights data: ' + error.message);
        }
    });

    expensesPerPageSelect.addEventListener('change', async () => {
        expensesPerPage = expensesPerPageSelect.value;
        localStorage.setItem('expensesPerPage', expensesPerPage);
        await fetchExpenses(1); 
    });

    const addNoteButton = document.getElementById("addNote");
    if (addNoteButton) { 
        addNoteButton.addEventListener("click", async (e) => {
            e.preventDefault(); 
            const note = document.getElementById("note").value;
            const date = document.getElementById("date").value;

            try {
                const response = await fetch('/api/notes', {
                    method: 'POST',
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ note, date })
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message);
                }
                alert('Note added successfully');
                document.getElementById("note").value = '';
                document.getElementById("date").value = '';
            } catch (error) {
                console.error('Error adding note:', error);
                alert('Failed to add note: ' + error.message);
            }
        });
    }

    
});