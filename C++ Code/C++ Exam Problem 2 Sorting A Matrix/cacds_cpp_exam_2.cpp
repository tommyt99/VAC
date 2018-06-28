//REPLACE ANY ?? FOR APPROPRIATE CODE

#include <iostream>
using namespace std;
 
// Sort arr[] of size n using Selection Sort. 
void SelectionSort (int arr[], int n)
{
	int i, j;
	for (i = 0; i < n; ++i)
	{
		for (j = i+1; j < n; ++j)
		{
			// Comparing consecutive data and switching values if value at i > j.
			if (arr[i] > arr[j])
			{
				arr[i] = arr[i]+arr[j];
				arr[j] = arr[i]-arr[j];
				arr[i] = arr[i]-arr[j];
			}	
		}
		// Value at i will be minimum of all the values above this index.
	}	
	
}	
 
int main()
{
	const int n=5;  //Hardcoded because of compiler issue. 
	int i; 
	cout<<"\nEnter the number of data element to be sorted: ";
	//cin>>n;
	 
	int arr[n];
	for(i = 0; i < n; i++)
	{
		cout<<"Enter element "<<i+1<<": ";
		cin>>arr[i];
	}
 
	SelectionSort(arr, n);
 
	// Display the sorted data.
	cout<<"\nSorted Data ";
	for (i = 0; i < n; i++)
		cout<<"->"<<arr[i];
 
	int o;
	cin >> o; 
	return 0;
}
