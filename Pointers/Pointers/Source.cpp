#include <iostream>
using namespace std;

int main() {

	float arr[5];
	float *ptr;

	cout << "display address of array" << endl;

	for (int i = 0; i<5; ++i)
		cout << "&arr[" << i << "]" << &arr[i] << endl;

	ptr = arr; // this is equivalent to saying ptr = arr[0] or the first value 

	cout << "Display address using pointers: " << endl;

	for (int i = 0; i<5; ++i)
		cout << "ptr + " << i << "=" << ptr + i << endl;

	*(ptr + 2) = 3.1415926;

	cout << arr[2];

	return 0;
}
