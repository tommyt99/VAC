// Matrix Multiplication 
/*
#include <iostream>
using namespace std;

int main()
{
   int  r1, c1, r2, c2, i, j, k;

    cout << "Enter rows and columns for first matrix: ";
    cin >> r1 >> c1;
    cout << "Enter rows and columns for second matrix: ";
    cin >> r2 >> c2;

	int a[r1][c1], b[r2][c2], mult[r1][c2];

    // If column of first matrix in not equal to row of second matrix,
    // ask the user to enter the size of matrix again.
    while (c1!=r2)
    {
		cout << "Enter rows and columns for first matrix: ";
		cin >> r1 >> c1;
		cout << "Enter rows and columns for second matrix: ";
		cin >> r2 >> c2;
    }

    // Storing elements of first matrix.
    cout << endl << "Enter elements of matrix 1:" << endl;
    for(i = 0; i < r1; ++i)
        for(j = 0; j < c1; ++j)
        {
            cout << "Enter element a" << i + 1 << j + 1 << " : ";
            cin >> a[i][j];
        }

    // Storing elements of second matrix.
    cout << endl << "Enter elements of matrix 2:" << endl;
    for(i = 0; i < r2; ++i)
        for(j = 0; j < c2; ++j)
        {
            cout << "Enter element b" << i + 1 << j + 1 << " : ";
            cin >> b[i][j];
        }

    // Initializing elements of matrix mult to 0.
    for(i = 0; i < r1; ++i)
        for(j = 0; j < c2; ++j)
        {
            mult[i][j]=0;
        }

    // Multiplying matrix a and b and storing in array mult.
    for(i = 0; i < r1; ++i)
        for(j = 0; j < c2; ++j)
            for(k = 0; k < c1; ++k)
            {
                mult[i][j] += a[i][k] * b[k][j];
            }

    // Displaying the multiplication of two matrix.
    cout << endl << "Output Matrix: " << endl;
    for(i = 0; i < r1; ++i)
    for(j = 0; j < c2; ++j)
    {
        cout << " " << mult[i][j];
        if(j == c2-1)
            cout << endl;
    }
	system("PAUSE");
    return 0;
}


*/


//Block multiplication
#include <iostream>
#include <ctime>
using namespace std;

int main()
{ // nxn matrix, sxs blocks 
	//int  r1, c1, r2, c2;
		int i, j, k;
	int s = 1; //Block size
	const int n = 2; 
	int N = n/s; // n/s
	double temp=0; 
	time_t tstart, tend; 
	/*cout << "Enter rows and columns for first matrix: ";
	cin >> r1 >> c1;
	cout << "Enter rows and columns for second matrix: ";
	cin >> r2 >> c2;*/

	int a[n][n], b[n][n], mult[n][n];

	// If column of first matrix in not equal to row of second matrix,
	// ask the user to enter the size of matrix again.
	/*while (c1 != r2)
	{
		cout << "Enter rows and columns for first matrix: ";
		cin >> r1 >> c1;
		cout << "Enter rows and columns for second matrix: ";
		cin >> r2 >> c2;
	}*/

	// Storing elements of first matrix.
	cout << endl << "Enter elements of matrix 1:" << endl;
	for (i = 0; i < n; ++i)
		for (j = 0; j < n; ++j)
		{
			cout << "Enter element a" << i + 1 << j + 1 << " : ";
			cin >> a[i][j];
		}

	// Storing elements of second matrix.
	cout << endl << "Enter elements of matrix 2:" << endl;
	for (i = 0; i < n; ++i)
		for (j = 0; j < n; ++j)
		{
			cout << "Enter element b" << i + 1 << j + 1 << " : ";
			cin >> b[i][j];
		}

	// Initializing elements of matrix mult to 0.
	for (i = 0; i < n; ++i)
		for (j = 0; j < n; ++j)
		{
			mult[i][j] = 0;
		}

	tstart = time(0);
	// Block Multiplication
	for (int jj = 0; jj<N; jj += s) {
		for (int kk = 0; kk<N; kk += s) {
			for (int i = 0; i<N; i++) {
				for (int j = jj; j<((jj + s)>N ? N : (jj + s)); j++) {
					temp = 0;
					for (int k = kk; k<((kk + s)>N ? N : (kk + s)); k++) {
						temp += a[i][k] * b[k][j];
					}
					mult[i][j] += temp;
				}
			}
		}
	}
	tend = time(0);
	cout << "It took " << difftime(tend, tstart) << " second(s)." << endl;

	// Displaying the multiplication of two matrix.
	cout << endl << "Output Matrix: " << endl;
	for (i = 0; i < n; ++i)
		for (j = 0; j < n; ++j)
		{
			cout << " " << mult[i][j];
			if (j == n - 1)
				cout << endl;
		}
	system("PAUSE");
	return 0;
}
