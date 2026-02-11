import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    SafeAreaView,
    Platform,
    StatusBar,
    Modal,
    AppState
} from 'react-native'
import React, { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface ExcelData {
    WSIN: string;
    ConsumerName: string;
    Location: string;
    Type: string;
    ConsumerType: string;
    Year: string;
    Month: string;
    Status: string;
    PresentReading: string;
    PreviousReading: string;
    Consumption: string;
    WaterCharge: string;
    Surcharge: string;
    OverallTotal: string;
    PaymentStatus: string;
    OfficialReceipt: string;
    ProcessedBy: string;
}

interface PaymentRecord {
    id: string;
    wsin: string;
    consumerName: string;
    location: string;
    serviceType: string;
    consumerType: string;
    year: string;
    month: string;
    previousReading: string;
    presentReading: string;
    waterConsumption: string;
    waterCharge: string;
    surcharge: string;
    overallTotal: string;
    paymentStatus: 'Unpaid' | 'Pending';
    processedBy: string;
    timestamp: string;
}

const Page = () => {
    // Form States
    const [serviceType, setServiceType] = useState<'residential' | 'commercial' | null>(null)
    const [consumerName, setConsumerName] = useState('')
    const [location, setLocation] = useState('')
    const [wsin, setWsin] = useState('')

    // Data from Excel
    const [excelData, setExcelData] = useState<ExcelData[]>([])
    const [filteredConsumers, setFilteredConsumers] = useState<ExcelData[]>([])

    // Dropdown States
    const [showConsumerDropdown, setShowConsumerDropdown] = useState(false)
    const [showLocationDropdown, setShowLocationDropdown] = useState(false)

    // Payment Modal State
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [previousReading, setPreviousReading] = useState('')
    const [presentReading, setPresentReading] = useState('')
    const [waterConsumption, setWaterConsumption] = useState('')
    const [waterCharge, setWaterCharge] = useState('')
    const [selectedConsumer, setSelectedConsumer] = useState<ExcelData | null>(null)

    // Generate Button State
    const [isGenerated, setIsGenerated] = useState(false)

    // Track last data count to prevent unnecessary reloads
    const [lastDataCount, setLastDataCount] = useState(0)

    // Location Options
    const locationOptions = [
        'LOTAO', 'CENTRAL', 'PALAWAN', 'CADUCAN', 'MORYO-MORYO',
        'HIGHWAY', 'BUSAY', 'DUWANGAN', 'SAN ROQUE', 'SAN ISIDRO', 'CALIAN'
    ]

    // Load Excel data on component mount
    useEffect(() => {
        loadExcelData()
        setupDataListener()
    }, [])

    // Set up listener for AsyncStorage changes
    const setupDataListener = () => {
        // Listen for app state changes (when app comes to foreground)
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                loadExcelData()
            }
        })

        return () => subscription.remove()
    }

    const loadExcelData = async () => {
        try {
            const data = await AsyncStorage.getItem('excelData')
            if (data) {
                const parsedData: ExcelData[] = JSON.parse(data)
                const newDataCount = parsedData.length

                // Only update if data has actually changed
                if (newDataCount !== lastDataCount || JSON.stringify(parsedData) !== JSON.stringify(excelData)) {
                    setExcelData(parsedData)
                    setLastDataCount(newDataCount)
                    console.log('Reader: Loaded', newDataCount, 'consumer records')
                }
            } else {
                if (lastDataCount !== 0) {
                    console.log('Reader: No Excel data found')
                    setExcelData([])
                    setLastDataCount(0)
                }
            }
        } catch (error) {
            console.error('Error loading Excel data:', error)
        }
    }

    // Function to manually refresh data
    const handleManualRefresh = async () => {
        await loadExcelData()
        Alert.alert('Success', 'Data refreshed successfully!')
    }

    // Check for data updates periodically (but less frequently)
    useEffect(() => {
        const interval = setInterval(() => {
            loadExcelData()
        }, 10000) // Check every 10 seconds instead of 3

        return () => clearInterval(interval)
    }, [lastDataCount, excelData])

    // Search consumers by name and location
    const handleSearch = () => {
        if (consumerName.trim().length === 0 || location.trim().length === 0) {
            Alert.alert('Error', 'Please enter both consumer name and location')
            return
        }

        console.log('Searching for:', consumerName, 'in location:', location);
        console.log('Total Excel records:', excelData.length);

        const filtered = excelData.filter(item => {
            const nameMatch = item.ConsumerName.toLowerCase().includes(consumerName.toLowerCase());
            const locationMatch = item.Location.toLowerCase() === location.toLowerCase();

            console.log('Item:', item.ConsumerName, item.Location, 'Name Match:', nameMatch, 'Location Match:', locationMatch);

            return nameMatch && locationMatch;
        });

        console.log('Filtered results:', filtered.length);

        if (filtered.length === 0) {
            Alert.alert('No Results', 'No consumers found with that name and location')
            setFilteredConsumers([])
        } else {
            setFilteredConsumers(filtered)
            setShowConsumerDropdown(true)
        }
    }

    // Handle consumer selection
    const handleConsumerSelect = (consumer: ExcelData) => {
        setConsumerName(consumer.ConsumerName)
        setLocation(consumer.Location)
        setWsin(consumer.WSIN)
        setServiceType(consumer.Type as 'residential' | 'commercial')
        setPreviousReading(consumer.PreviousReading)
        setSelectedConsumer(consumer)
        setShowConsumerDropdown(false)
        setFilteredConsumers([])
        setIsGenerated(false) // Reset generate status when new consumer is selected

        // Automatically open the payment modal after selecting consumer
        setShowPaymentModal(true)
    }

    // Handle location selection
    const handleLocationSelect = (loc: string) => {
        setLocation(loc)
        setShowLocationDropdown(false)
    }

    // Handle Clear Button
    const handleClear = () => {
        setServiceType(null)
        setConsumerName('')
        setLocation('')
        setWsin('')
        setSelectedConsumer(null)
        setPreviousReading('')
        setPresentReading('')
        setWaterConsumption('')
        setWaterCharge('')
        setFilteredConsumers([])
        setIsGenerated(false) // Reset generate status on clear
    }

    // Calculate Water Consumption and Charge
    const calculateWaterData = () => {
        const prev = parseFloat(previousReading) || 0
        const pres = parseFloat(presentReading) || 0

        if (pres < prev) {
            Alert.alert('Error', 'Present reading cannot be less than previous reading')
            return
        }

        const consumption = pres - prev
        setWaterConsumption(consumption.toString())

        // Calculate water charge based on service type
        let charge = 0
        if (serviceType === 'residential') {
            if (consumption <= 5) {
                charge = 62.50
            } else {
                charge = 62.50 + ((consumption - 5) * 12.50)
            }
        } else if (serviceType === 'commercial') {
            if (consumption <= 5) {
                charge = 62.50
            } else {
                charge = 62.50 + ((consumption - 5) * 12.50)
            }
        }

        setWaterCharge(charge.toFixed(2))
    }

    // Handle Generate Button
    const handleGenerate = () => {
        if (!presentReading) {
            Alert.alert('Error', 'Please enter present reading first')
            return
        }

        calculateWaterData()
        setIsGenerated(true)
    }

    // Handle Submit Payment
    const handleSubmitPayment = async () => {
        if (!presentReading) {
            Alert.alert('Error', 'Please enter present reading')
            return
        }

        if (!isGenerated) {
            Alert.alert('Error', 'Please generate the computation first by clicking the Generate button')
            return
        }

        try {
            if (!selectedConsumer) {
                throw new Error('No consumer selected')
            }

            // Calculate consumption and charge if not already calculated
            const prev = parseFloat(previousReading) || 0
            const pres = parseFloat(presentReading) || 0
            const consumption = pres - prev

            let charge = 0
            if (serviceType === 'residential') {
                if (consumption <= 5) {
                    charge = 62.50
                } else {
                    charge = 62.50 + ((consumption - 5) * 12.50)
                }
            } else if (serviceType === 'commercial') {
                if (consumption <= 5) {
                    charge = 62.50
                } else {
                    charge = 62.50 + ((consumption - 5) * 12.50)
                }
            }

            // Update the Excel data with new readings but keep PaymentStatus as 'Unpaid'
            const updatedExcelData = excelData.map(item => {
                if (item.WSIN === selectedConsumer.WSIN &&
                    item.ConsumerName === selectedConsumer.ConsumerName &&
                    item.Year === selectedConsumer.Year &&
                    item.Month === selectedConsumer.Month) {
                    return {
                        ...item,
                        PresentReading: presentReading,
                        Consumption: consumption.toString(),
                        WaterCharge: charge.toFixed(2),
                        OverallTotal: charge.toFixed(2),
                        PaymentStatus: 'Unpaid',
                        ProcessedBy: 'System Admin',
                    }
                }
                return item
            })

            // Save updated Excel data back to storage
            await AsyncStorage.setItem('excelData', JSON.stringify(updatedExcelData))
            setExcelData(updatedExcelData)
            setLastDataCount(updatedExcelData.length)

            // Also save to payment records for Database.tsx with 'Unpaid' status
            await savePaymentRecord(consumption.toString(), charge.toFixed(2))

            Alert.alert('Success', 'Reading information has been recorded! Payment status: Unpaid')
            setShowPaymentModal(false)
            handleClear()

        } catch (error) {
            Alert.alert('Error', 'Failed to save reading record')
            console.error(error)
        }
    }

    const savePaymentRecord = async (consumption: string, charge: string) => {
        if (!selectedConsumer) return

        const paymentRecord: PaymentRecord = {
            id: Date.now().toString(),
            wsin: selectedConsumer.WSIN,
            consumerName: selectedConsumer.ConsumerName,
            location: selectedConsumer.Location,
            serviceType: selectedConsumer.Type,
            consumerType: selectedConsumer.ConsumerType,
            year: selectedConsumer.Year,
            month: selectedConsumer.Month,
            previousReading: selectedConsumer.PreviousReading,
            presentReading: presentReading,
            waterConsumption: consumption,
            waterCharge: charge,
            surcharge: '0.00',
            overallTotal: charge,
            paymentStatus: 'Unpaid',
            processedBy: 'System Admin',
            timestamp: new Date().toISOString()
        }

        // Save to payment records (for Database.tsx)
        const existingRecords = await AsyncStorage.getItem('paymentRecords')
        const records: PaymentRecord[] = existingRecords ? JSON.parse(existingRecords) : []
        records.push(paymentRecord)
        await AsyncStorage.setItem('paymentRecords', JSON.stringify(records))
    }

    // Custom Dropdown Component
    const CustomDropdown = ({
        visible,
        items,
        onSelect,
        onClose,
        type = 'consumer'
    }: {
        visible: boolean;
        items: any[];
        onSelect: (item: any) => void;
        onClose: () => void;
        type?: 'consumer' | 'location';
    }) => {
        if (!visible) return null

        return (
            <Modal
                visible={visible}
                transparent={true}
                animationType="slide"
                onRequestClose={onClose}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    onPress={onClose}
                    activeOpacity={1}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {type === 'consumer' ? 'Select Consumer' : 'Select Location'}
                        </Text>

                        {type === 'consumer' ? (
                            // Table format for consumers
                            <ScrollView style={styles.modalScrollView} horizontal={true}>
                                <View style={styles.consumerTableContainer}>
                                    {/* Table Header */}
                                    <View style={styles.consumerTableHeader}>
                                        <View style={styles.consumerNameHeader}><Text style={styles.consumerHeaderCell}>Consumer Name</Text></View>
                                        <View style={styles.consumerLocationHeader}><Text style={styles.consumerHeaderCell}>Location</Text></View>
                                        <View style={styles.consumerWsinHeader}><Text style={styles.consumerHeaderCell}>WSIN</Text></View>
                                    </View>

                                    {/* Table Rows */}
                                    {items.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.consumerTableRow}
                                            onPress={() => onSelect(item)}
                                        >
                                            <View style={styles.consumerNameCell}><Text style={styles.consumerCell}>{item.ConsumerName}</Text></View>
                                            <View style={styles.consumerLocationCell}><Text style={styles.consumerCell}>{item.Location}</Text></View>
                                            <View style={styles.consumerWsinCell}><Text style={styles.consumerCell}>{item.WSIN}</Text></View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </ScrollView>
                        ) : (
                            // Original list format for locations
                            <ScrollView style={styles.modalScrollView}>
                                {items.map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.modalItem}
                                        onPress={() => onSelect(item)}
                                    >
                                        <Text style={styles.modalItemText}>{item}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={onClose}
                        >
                            <Text style={styles.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        )
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.header}>Consumer Information</Text>

                {/* Refresh Button */}
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleManualRefresh}
                >
                    <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
                </TouchableOpacity>

                {/* Data Status */}
                <View style={styles.dataStatusSection}>
                    <Text style={styles.dataStatusText}>
                        Loaded {excelData.length} consumer records
                    </Text>
                    <Text style={styles.dataStatusSubText}>
                        Last updated: {new Date().toLocaleTimeString()}
                    </Text>
                </View>

                {/* Service Type */}
                <View style={styles.section}>
                    <Text style={styles.label}>Service Type</Text>
                    <View style={styles.radioGroup}>
                        <TouchableOpacity
                            style={styles.radioButton}
                            onPress={() => setServiceType('residential')}
                        >
                            <View style={styles.radioCircle}>
                                {serviceType === 'residential' && <View style={styles.selectedRb} />}
                            </View>
                            <Text style={styles.radioLabel}>Residential</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.radioButton}
                            onPress={() => setServiceType('commercial')}
                        >
                            <View style={styles.radioCircle}>
                                {serviceType === 'commercial' && <View style={styles.selectedRb} />}
                            </View>
                            <Text style={styles.radioLabel}>Commercial</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Consumer Name */}
                <View style={styles.section}>
                    <Text style={styles.label}>Consumer Name</Text>
                    <TextInput
                        style={styles.textInput}
                        value={consumerName}
                        onChangeText={setConsumerName}
                        placeholder="Enter consumer name..."
                    />
                </View>

                {/* Location Dropdown */}
                <View style={styles.section}>
                    <Text style={styles.label}>Location</Text>
                    <TouchableOpacity
                        style={styles.dropdownTrigger}
                        onPress={() => setShowLocationDropdown(true)}
                    >
                        <Text style={location ? styles.dropdownText : styles.dropdownPlaceholder}>
                            {location || 'Select Location'}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <CustomDropdown
                        visible={showLocationDropdown}
                        items={locationOptions}
                        onSelect={handleLocationSelect}
                        onClose={() => setShowLocationDropdown(false)}
                        type="location"
                    />
                </View>

                {/* WSIN Input Field (Always visible) */}
                <View style={styles.section}>
                    <Text style={styles.label}>WSIN (Water Service Identification Number)</Text>
                    <TextInput
                        style={[styles.textInput, styles.disabledInput]}
                        value={wsin}
                        placeholder="Auto-filled when consumer is selected"
                        editable={false}
                    />
                </View>

                {/* Search Button */}
                <TouchableOpacity
                    style={styles.searchButton}
                    onPress={handleSearch}
                >
                    <Text style={styles.searchButtonText}>Search Consumer</Text>
                </TouchableOpacity>

                {/* Consumer Selection Dropdown */}
                <CustomDropdown
                    visible={showConsumerDropdown}
                    items={filteredConsumers}
                    onSelect={handleConsumerSelect}
                    onClose={() => setShowConsumerDropdown(false)}
                    type="consumer"
                />

                {/* Action Buttons - Only Clear Button Remains */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.clearButton]}
                        onPress={handleClear}
                    >
                        <Text style={styles.clearButtonText}>Clear</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacer */}
                <View style={styles.bottomSpacer} />
            </ScrollView>

            {/* Payment Modal */}
            <Modal
                visible={showPaymentModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentModal(false)}
            >
                <View style={styles.paymentModalOverlay}>
                    <View style={styles.paymentModalContent}>
                        <Text style={styles.paymentHeader}>Record Water Reading</Text>

                        <ScrollView style={styles.paymentScrollView}>
                            {/* Consumer Information */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Consumer Information</Text>

                                {/* Consumer Name */}
                                <View style={styles.consumerInfoRow}>
                                    <Text style={styles.consumerInfoLabel}>Consumer Name:</Text>
                                    <Text style={styles.consumerInfoValue}>{selectedConsumer?.ConsumerName}</Text>
                                </View>

                                {/* Location */}
                                <View style={styles.consumerInfoRow}>
                                    <Text style={styles.consumerInfoLabel}>Location:</Text>
                                    <Text style={styles.consumerInfoValue}>{selectedConsumer?.Location}</Text>
                                </View>

                                {/* WSIN */}
                                <View style={styles.consumerInfoRow}>
                                    <Text style={styles.consumerInfoLabel}>WSIN:</Text>
                                    <Text style={styles.consumerInfoValue}>{selectedConsumer?.WSIN}</Text>
                                </View>

                                {/* Service Type */}
                                <View style={styles.consumerInfoRow}>
                                    <Text style={styles.consumerInfoLabel}>Service Type:</Text>
                                    <Text style={styles.consumerInfoValue}>{selectedConsumer?.Type}</Text>
                                </View>
                            </View>

                            {/* Previous Reading (Auto-filled) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Previous Reading (Auto-filled)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={previousReading}
                                    placeholder="Auto-filled from Excel"
                                    editable={false}
                                />
                            </View>

                            {/* Present Reading */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Present Reading *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    value={presentReading}
                                    onChangeText={setPresentReading}
                                    placeholder="Enter present reading"
                                    keyboardType="numeric"
                                />
                            </View>

                            {/* Generate Button */}
                            <TouchableOpacity
                                style={[styles.generateButton, !presentReading && styles.disabledButton]}
                                onPress={handleGenerate}
                                disabled={!presentReading}
                            >
                                <Text style={styles.generateButtonText}>Calculate Computation</Text>
                            </TouchableOpacity>

                            {/* Water Consumption (Auto-calculated) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Water Consumption (m³)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={waterConsumption}
                                    placeholder="Auto-calculated"
                                    editable={false}
                                />
                            </View>

                            {/* Water Charge (Auto-calculated) */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Water Charge (₱)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.disabledInput]}
                                    value={waterCharge}
                                    placeholder="Auto-calculated"
                                    editable={false}
                                />
                            </View>

                            {/* Payment Status Notice */}
                            <View style={styles.noticeSection}>
                                <Text style={styles.noticeText}>
                                    💡 Note: After recording the reading, the payment status will be set to "Unpaid"
                                </Text>
                            </View>
                        </ScrollView>

                        {/* Action Buttons */}
                        <View style={styles.paymentModalButtons}>
                            <TouchableOpacity
                                style={[styles.paymentButton, styles.cancelButton]}
                                onPress={() => setShowPaymentModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.paymentButton, styles.submitButton, !isGenerated && styles.disabledButton]}
                                onPress={handleSubmitPayment}
                                disabled={!isGenerated}
                            >
                                <Text style={styles.submitButtonText}>Record Reading</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

export default Page

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    header: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
        marginTop: 5,
    },
    refreshButton: {
        backgroundColor: '#007AFF',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        marginHorizontal: 10,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    dataStatusSection: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        marginBottom: 15,
        marginHorizontal: 10,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    dataStatusText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
        marginBottom: 4,
    },
    dataStatusSubText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 12,
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    radioGroup: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    radioButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioCircle: {
        height: 18,
        width: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#007AFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    selectedRb: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },
    radioLabel: {
        fontSize: 14,
        color: '#333',
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        fontSize: 14,
        backgroundColor: 'white',
    },
    disabledInput: {
        backgroundColor: '#f8f8f8',
        color: '#666',
    },
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        backgroundColor: 'white',
    },
    dropdownText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownPlaceholder: {
        fontSize: 14,
        color: '#999',
    },
    dropdownArrow: {
        fontSize: 12,
        color: '#666',
    },
    searchButton: {
        backgroundColor: '#007AFF',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
        marginHorizontal: 10,
    },
    searchButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    generateButton: {
        backgroundColor: '#28a745',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginVertical: 10,
        marginHorizontal: 10,
    },
    generateButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginHorizontal: 10,
        gap: 10,
    },
    actionButton: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        minWidth: 100,
    },
    clearButton: {
        backgroundColor: '#6c757d',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    clearButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomSpacer: {
        height: 80,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    modalScrollView: {
        maxHeight: 400,
    },
    modalItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalItemText: {
        fontSize: 14,
        color: '#333',
    },
    modalCloseButton: {
        marginTop: 15,
        padding: 12,
        backgroundColor: '#007AFF',
        borderRadius: 6,
        alignItems: 'center',
    },
    modalCloseText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Payment Modal Styles
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    paymentModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    paymentHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        textAlign: 'center',
        color: '#333',
    },
    paymentScrollView: {
        maxHeight: 400,
    },
    paymentModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        gap: 10,
    },
    paymentButton: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    submitButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    noticeSection: {
        backgroundColor: '#E3F2FD',
        padding: 12,
        borderRadius: 6,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
        marginTop: 10,
    },
    noticeText: {
        fontSize: 12,
        color: '#1565C0',
        fontStyle: 'italic',
    },
    // Consumer Table Styles for Modal
    consumerTableContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
    },
    consumerTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        padding: 12,
    },
    consumerHeaderCell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
    },
    consumerTableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        padding: 12,
        alignItems: 'center',
        backgroundColor: 'white',
    },
    consumerCell: {
        fontSize: 12,
        color: '#333',
        textAlign: 'center',
    },
    // Consumer table cell widths with borders
    consumerNameHeader: {
        width: 200,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'white',
    },
    consumerLocationHeader: {
        width: 155,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: 'white',
    },
    consumerWsinHeader: {
        width: 120,
        alignItems: 'center',
    },
    consumerNameCell: {
        width: 200,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    consumerLocationCell: {
        width: 155,
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#f0f0f0',
    },
    consumerWsinCell: {
        width: 120,
        alignItems: 'center',
    },
    // Add to the styles object
    consumerInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    consumerInfoLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    consumerInfoValue: {
        fontSize: 14,
        color: '#666',
        flex: 1,
        textAlign: 'right',
    },
})